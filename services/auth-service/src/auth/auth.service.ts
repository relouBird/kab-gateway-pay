import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IdentityStatus,
  OtpPurpose,
  Prisma,
  type SubjectType,
} from '@prisma/client';
import {
  PERMISSION_CATALOG,
  SUPER_ADMIN_ONLY_PERMISSIONS,
  type Permission,
} from '@kgpay/contracts';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { isEmail } from 'class-validator';
import { OtpService } from './otp.service';
import { PasswordService } from '../security/password.service';
import { TokenService } from '../security/token.service';
import { appendAuditEvent, AuditService } from '../security/audit.service';
import { InvitationEmailService } from '../email-otp/invitation-email.service';
import type { RequestMetadata } from '../common/request-context';
import type { AuthConfig } from '../config/auth.config';
import type {
  AcceptInvitationDto,
  AssignRoleDto,
  ChangePasswordDto,
  CreateCustomRoleDto,
  CreateStaffInvitationDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateEmailDto,
  VerifyOtpDto,
} from './auth.dto';
import type { AuthContext } from '../common/auth-context';

const GENERIC_AUTH_FAILURE = 'Invalid email or password.';
const REGISTRATION_MESSAGE =
  'If the address can be used, a verification code has been sent.';
const INVITATION_MESSAGE =
  'If the address is eligible, the staff invitation has been sent.';

type IdentityWithRoles = Prisma.IdentityGetPayload<{
  include: {
    roles: {
      include: {
        role: { include: { permissions: true } };
      };
    };
  };
}>;

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  expiresIn: number;
  sessionId: string;
  subjectType: SubjectType;
  roles: string[];
}

@Injectable()
export class AuthService {
  private readonly ipHashKey =
    process.env.IP_HASH_KEY ?? randomBytes(32).toString('hex');

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly invitations: InvitationEmailService,
    private readonly config: AuthConfig,
  ) {}

  async register(
    input: RegisterDto,
    locale: 'en' | 'fr',
    metadata: RequestMetadata,
  ): Promise<{ message: string; challengeId: string }> {
    this.passwords.validate(input.password);
    const email = normalizeEmail(input.email);
    const passwordHash = await this.passwords.hash(input.password);
    const identityId = randomUUID();
    const role = await this.prisma.role.findUnique({
      where: { code: 'CUSTOMER' },
      select: { id: true },
    });
    if (!role) {
      throw new Error('The built-in CUSTOMER role has not been seeded.');
    }

    try {
      await this.prisma.identity.create({
        data: {
          id: identityId,
          subjectType: 'CUSTOMER',
          email,
          emailNormalized: email,
          phone: normalizePhone(input.phone),
          passwordHash,
          passwordChangedAt: new Date(),
          status: IdentityStatus.PENDING_VERIFICATION,
          roles: {
            create: { roleId: role.id },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.identity.findUnique({
          where: { emailNormalized: email },
          select: { id: true, email: true, subjectType: true, status: true },
        });
        if (
          existing?.subjectType === 'CUSTOMER' &&
          existing.status === IdentityStatus.PENDING_VERIFICATION
        ) {
          try {
            const challenge = await this.otp.issue(
              { id: existing.id, email: existing.email },
              OtpPurpose.CONTACT_VERIFICATION,
              null,
              locale,
              metadata,
            );
            return {
              message: REGISTRATION_MESSAGE,
              challengeId: challenge.challengeId,
            };
          } catch (issueError) {
            if (!(
              issueError instanceof HttpException &&
              issueError.getStatus() === HttpStatus.TOO_MANY_REQUESTS
            )) {
              throw issueError;
            }
          }
        }
        return { message: REGISTRATION_MESSAGE, challengeId: randomUUID() };
      }
      throw error;
    }

    await this.audit.record({
      identityId,
      eventType: 'REGISTRATION_REQUESTED',
      result: 'PENDING_VERIFICATION',
      ...metadata,
    });
    const challenge = await this.otp.issue(
      { id: identityId, email },
      OtpPurpose.CONTACT_VERIFICATION,
      null,
      locale,
      metadata,
    );
    return {
      message: REGISTRATION_MESSAGE,
      challengeId: challenge.challengeId,
    };
  }

  async verifyContact(
    input: VerifyOtpDto,
    metadata: RequestMetadata,
  ): Promise<{ status: IdentityStatus }> {
    const consumed = await this.otp.consume(
      input.challengeId,
      input.code,
      OtpPurpose.CONTACT_VERIFICATION,
      undefined,
      metadata,
    );
    const now = new Date();
    const activated = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${consumed.identityId}))
      `;
      const identity = await transaction.identity.findUniqueOrThrow({
        where: { id: consumed.identityId },
        select: { subjectType: true, status: true },
      });
      if (identity.status !== IdentityStatus.PENDING_VERIFICATION) {
        throw new BadRequestException('The identity cannot be activated.');
      }
      const update = await transaction.identity.updateMany({
        where: {
          id: consumed.identityId,
          status: IdentityStatus.PENDING_VERIFICATION,
          emailVerifiedAt: null,
        },
        data: {
          status: IdentityStatus.ACTIVE,
          emailVerifiedAt: now,
        },
      });
      if (update.count !== 1) {
        throw new BadRequestException('The identity cannot be activated.');
      }
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName:
            identity.subjectType === 'CUSTOMER'
              ? 'IdentityRegistered'
              : 'IdentityActivated',
          payload: {
            eventId: randomUUID(),
            identityId: consumed.identityId,
            subjectType: identity.subjectType,
            occurredAt: now.toISOString(),
          },
          occurredAt: now,
        },
      });
      await appendAuditEvent(transaction, {
        identityId: consumed.identityId,
        eventType: 'CONTACT_VERIFIED',
        result: 'SUCCESS',
        ...metadata,
      });
      return transaction.identity.findUniqueOrThrow({
        where: { id: consumed.identityId },
        select: { status: true },
      });
    });
    return { status: activated.status };
  }

  async bootstrapSuperAdmin(
    input: {
      email: string;
      phone: string;
      password: string;
    },
    locale: 'en' | 'fr' = 'fr',
  ): Promise<{ identityId: string; challengeId: string }> {
    this.passwords.validate(input.password);
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    if (!isEmail(email)) {
      throw new BadRequestException(
        'The initial administrator contact details are invalid.',
      );
    }
    const passwordHash = await this.passwords.hash(input.password);
    const newIdentityId = randomUUID();
    const role = await this.prisma.role.findUnique({
      where: { code: 'GLOBAL_SUPER_ADMIN' },
      select: { id: true },
    });
    if (!role) {
      throw new Error(
        'The built-in GLOBAL_SUPER_ADMIN role has not been seeded.',
      );
    }

    const identityId = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext('kgpay-global-admin-invariant'))
        `;
        const existingBootstrap = await transaction.systemSetting.findUnique({
          where: { key: 'INITIAL_SUPER_ADMIN' },
        });
        if (existingBootstrap) {
          const pendingIdentity = await transaction.identity.findUnique({
            where: { id: existingBootstrap.value },
            select: {
              id: true,
              emailNormalized: true,
              subjectType: true,
              status: true,
            },
          });
          if (
            pendingIdentity?.subjectType === 'STAFF' &&
            pendingIdentity.status === IdentityStatus.PENDING_VERIFICATION
          ) {
            const emailOwner = await transaction.identity.findUnique({
              where: { emailNormalized: email },
              select: { id: true },
            });
            if (emailOwner && emailOwner.id !== pendingIdentity.id) {
              throw new ConflictException(
                'The email address is already in use.',
              );
            }
            await transaction.identity.update({
              where: { id: pendingIdentity.id },
              data: {
                email,
                emailNormalized: email,
                phone,
                passwordHash,
                passwordChangedAt: new Date(),
              },
            });
            await transaction.otpChallenge.updateMany({
              where: {
                identityId: pendingIdentity.id,
                consumedAt: null,
              },
              data: { consumedAt: new Date() },
            });
            await appendAuditEvent(transaction, {
              identityId: pendingIdentity.id,
              eventType: 'INITIAL_SUPER_ADMIN_BOOTSTRAP_RESTARTED',
              result: 'PENDING_EMAIL_VERIFICATION',
              correlationId: randomUUID(),
              metadata: { source: 'CLI' },
            });
            return pendingIdentity.id;
          }
          throw new ConflictException(
            'The initial global super administrator has already been created.',
          );
        }
        const existingEmail = await transaction.identity.findUnique({
          where: { emailNormalized: email },
          select: { id: true },
        });
        if (existingEmail) {
          throw new ConflictException('The email address is already in use.');
        }
        const existingAdmin = await transaction.identityRole.count({
          where: {
            role: { code: 'GLOBAL_SUPER_ADMIN' },
          },
        });
        if (existingAdmin > 0) {
          throw new ConflictException(
            'The initial global super administrator has already been created.',
          );
        }
        await transaction.identity.create({
          data: {
            id: newIdentityId,
            subjectType: 'STAFF',
            email,
            emailNormalized: email,
            phone,
            passwordHash,
            passwordChangedAt: new Date(),
            status: IdentityStatus.PENDING_VERIFICATION,
            roles: {
              create: { roleId: role.id },
            },
          },
        });
        await transaction.systemSetting.create({
          data: { key: 'INITIAL_SUPER_ADMIN', value: newIdentityId },
        });
        await appendAuditEvent(transaction, {
          identityId: newIdentityId,
          eventType: 'INITIAL_SUPER_ADMIN_CREATED',
          result: 'PENDING_EMAIL_VERIFICATION',
          correlationId: randomUUID(),
        });
        return newIdentityId;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const challenge = await this.otp.issue(
      { id: identityId, email },
      OtpPurpose.CONTACT_VERIFICATION,
      null,
      locale,
    );
    return { identityId, challengeId: challenge.challengeId };
  }

  async login(
    input: LoginDto,
    locale: 'en' | 'fr',
    metadata: RequestMetadata,
  ): Promise<{ challengeId: string; expiresAt: Date }> {
    const now = new Date();
    const email = normalizeEmail(input.email);
    const identity = await this.prisma.identity.findUnique({
      where: { emailNormalized: email },
    });
    const ipHash = this.hashIp(metadata.ipAddress);
    if (!(await this.reserveIpLoginAttempt(ipHash, now))) {
      await this.recordLoginFailure(identity?.id, metadata, 'IP_RATE_LIMIT');
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }

    const passwordMatches = identity?.passwordHash
      ? await this.passwords.verify(identity.passwordHash, input.password)
      : await this.passwords
          .burnForUnknownIdentity(input.password)
          .then(() => false);
    const identityLocked = Boolean(
      identity?.lockedUntil && identity.lockedUntil > now,
    );
    if (
      !identity ||
      !passwordMatches ||
      identity.status !== IdentityStatus.ACTIVE ||
      !identity.emailVerifiedAt
    ) {
      await this.recordFailedCredential(identity?.id, metadata, now);
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }
    if (identityLocked) {
      await this.recordLoginFailure(identity.id, metadata, 'IDENTITY_LOCKED');
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }

    const accepted = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${identity.id}))
        `;
        const current = await transaction.identity.findUniqueOrThrow({
          where: { id: identity.id },
          select: {
            emailNormalized: true,
            passwordHash: true,
            passwordChangedAt: true,
            status: true,
            emailVerifiedAt: true,
            lockedUntil: true,
          },
        });
        const stillValid =
          current.emailNormalized === email &&
          current.passwordHash === identity.passwordHash &&
          (current.passwordChangedAt?.getTime() ?? null) ===
            (identity.passwordChangedAt?.getTime() ?? null) &&
          current.status === IdentityStatus.ACTIVE &&
          current.emailVerifiedAt !== null &&
          (!current.lockedUntil || current.lockedUntil <= now);
        if (stillValid) {
          await transaction.identity.update({
            where: { id: identity.id },
            data: { failedLoginCount: 0, lockedUntil: null },
          });
        }
        await appendAuditEvent(transaction, {
          identityId: identity.id,
          eventType: stillValid ? 'LOGIN_PASSWORD_ACCEPTED' : 'LOGIN_FAILED',
          result: stillValid ? 'MFA_REQUIRED' : 'REJECTED',
          ...metadata,
          ...(stillValid
            ? {}
            : { metadata: { reason: 'IDENTITY_STATE_CHANGED' } }),
        });
        return stillValid;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!accepted) {
      throw new UnauthorizedException(GENERIC_AUTH_FAILURE);
    }
    return this.otp.issue(
      { id: identity.id, email: identity.email },
      OtpPurpose.LOGIN,
      null,
      locale,
      metadata,
      credentialVersionFor(identity),
    );
  }

  async verifyLogin(
    input: VerifyOtpDto,
    metadata: RequestMetadata,
  ): Promise<AuthSessionResult> {
    const consumed = await this.otp.consume(
      input.challengeId,
      input.code,
      OtpPurpose.LOGIN,
      undefined,
      metadata,
    );
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${consumed.identityId}))
        `;
        const identity = await transaction.identity.findUniqueOrThrow({
          where: { id: consumed.identityId },
          include: {
            roles: { include: { role: { include: { permissions: true } } } },
          },
        });
        if (
          identity.status !== IdentityStatus.ACTIVE ||
          !identity.emailVerifiedAt ||
          !identity.passwordHash ||
          credentialVersionFor(identity) !== consumed.credentialVersion
        ) {
          throw new UnauthorizedException('The identity is not active.');
        }
        return this.createSession(transaction, identity, metadata);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async resendOtp(
    challengeId: string,
    locale: 'en' | 'fr',
    metadata: RequestMetadata,
  ): Promise<{ challengeId: string; expiresAt: Date }> {
    return this.otp.resend(challengeId, locale, metadata);
  }

  async forgotPassword(
    input: ForgotPasswordDto,
    locale: 'en' | 'fr',
    metadata: RequestMetadata,
  ): Promise<{ message: string; challengeId: string }> {
    const identity = await this.prisma.identity.findUnique({
      where: { emailNormalized: normalizeEmail(input.email) },
      select: {
        id: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
        passwordChangedAt: true,
        emailNormalized: true,
      },
    });
    if (
      !identity ||
      identity.status !== IdentityStatus.ACTIVE ||
      !identity.emailVerifiedAt
    ) {
      await this.audit.record({
        eventType: 'PASSWORD_RECOVERY_REQUESTED',
        result: 'NOT_ELIGIBLE',
        ...metadata,
      });
      return {
        message: 'If the address can be used, a recovery code has been sent.',
        challengeId: randomUUID(),
      };
    }
    await this.audit.record({
      identityId: identity.id,
      eventType: 'PASSWORD_RECOVERY_REQUESTED',
      result: 'OTP_REQUESTED',
      ...metadata,
    });
    let challengeId: string;
    try {
      const challenge = await this.otp.issue(
        identity,
        OtpPurpose.PASSWORD_RECOVERY,
        null,
        locale,
        metadata,
        credentialVersionFor(identity),
      );
      challengeId = challenge.challengeId;
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ) {
        return {
          message: 'If the address can be used, a recovery code has been sent.',
          challengeId: randomUUID(),
        };
      }
      throw error;
    }
    return {
      message: 'If the address can be used, a recovery code has been sent.',
      challengeId,
    };
  }

  async resetPassword(
    input: ResetPasswordDto,
    metadata: RequestMetadata,
  ): Promise<void> {
    this.passwords.validate(input.newPassword);
    const consumed = await this.otp.consume(
      input.challengeId,
      input.code,
      OtpPurpose.PASSWORD_RECOVERY,
      undefined,
      metadata,
    );
    const passwordHash = await this.passwords.hash(input.newPassword);
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${consumed.identityId}))
      `;
      const current = await transaction.identity.findUniqueOrThrow({
        where: { id: consumed.identityId },
        select: {
          status: true,
          passwordChangedAt: true,
          emailNormalized: true,
        },
      });
      if (
        current.status !== IdentityStatus.ACTIVE ||
        credentialVersionFor(current) !== consumed.credentialVersion
      ) {
        throw new UnauthorizedException('The identity is not active.');
      }
      await transaction.identity.update({
        where: { id: consumed.identityId },
        data: { passwordHash, passwordChangedAt: now },
      });
      await transaction.sessionFamily.updateMany({
        where: { identityId: consumed.identityId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'PASSWORD_RESET' },
      });
      await transaction.otpChallenge.updateMany({
        where: { identityId: consumed.identityId, consumedAt: null },
        data: { consumedAt: now },
      });
      await appendAuditEvent(transaction, {
        identityId: consumed.identityId,
        eventType: 'PASSWORD_RESET',
        result: 'SUCCESS',
        ...metadata,
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'SessionRevoked',
          payload: {
            eventId: randomUUID(),
            identityId: consumed.identityId,
            reason: 'PASSWORD_RESET',
            occurredAt: now.toISOString(),
          },
          occurredAt: now,
        },
      });
    });
  }

  async changePassword(
    auth: AuthContext,
    input: ChangePasswordDto,
    metadata: RequestMetadata,
  ): Promise<void> {
    this.passwords.validate(input.newPassword);
    const identity = await this.prisma.identity.findUnique({
      where: { id: auth.identityId },
      select: { passwordHash: true, status: true },
    });
    if (
      !identity?.passwordHash ||
      identity.status !== IdentityStatus.ACTIVE ||
      !(await this.passwords.verify(
        identity.passwordHash,
        input.currentPassword,
      ))
    ) {
      throw new UnauthorizedException('The current password is incorrect.');
    }
    const passwordHash = await this.passwords.hash(input.newPassword);
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${auth.identityId}))
      `;
      const current = await transaction.identity.findUniqueOrThrow({
        where: { id: auth.identityId },
        select: { passwordHash: true, status: true },
      });
      if (
        current.status !== IdentityStatus.ACTIVE ||
        current.passwordHash !== identity.passwordHash
      ) {
        throw new UnauthorizedException('The current password is incorrect.');
      }
      await transaction.identity.update({
        where: { id: auth.identityId },
        data: { passwordHash, passwordChangedAt: now },
      });
      await transaction.sessionFamily.updateMany({
        where: { identityId: auth.identityId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'PASSWORD_CHANGED' },
      });
      await transaction.otpChallenge.updateMany({
        where: { identityId: auth.identityId, consumedAt: null },
        data: { consumedAt: now },
      });
      await appendAuditEvent(transaction, {
        identityId: auth.identityId,
        eventType: 'PASSWORD_CHANGED',
        result: 'SUCCESS',
        ...metadata,
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'SessionRevoked',
          payload: {
            eventId: randomUUID(),
            identityId: auth.identityId,
            reason: 'PASSWORD_CHANGED',
            occurredAt: now.toISOString(),
          },
          occurredAt: now,
        },
      });
    });
  }

  async acceptInvitation(
    input: AcceptInvitationDto,
    metadata: RequestMetadata,
  ): Promise<{ status: IdentityStatus }> {
    this.passwords.validate(input.password);
    const tokenHash = this.tokens.hashOpaqueToken(input.token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { identity: true },
    });
    if (
      !invitation ||
      invitation.consumedAt ||
      invitation.expiresAt <= new Date() ||
      invitation.identity.status !== IdentityStatus.PENDING_INVITATION
    ) {
      throw new BadRequestException('The invitation is invalid or expired.');
    }
    const passwordHash = await this.passwords.hash(input.password);
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${invitation.identityId}))
      `;
      const used = await transaction.invitation.updateMany({
        where: {
          id: invitation.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (used.count !== 1) {
        throw new BadRequestException('The invitation is invalid or expired.');
      }
      const activated = await transaction.identity.updateMany({
        where: {
          id: invitation.identityId,
          status: IdentityStatus.PENDING_INVITATION,
        },
        data: {
          passwordHash,
          passwordChangedAt: now,
          emailVerifiedAt: now,
          status: IdentityStatus.ACTIVE,
        },
      });
      if (activated.count !== 1) {
        throw new BadRequestException('The invitation is invalid or expired.');
      }
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'IdentityActivated',
          payload: {
            eventId: randomUUID(),
            identityId: invitation.identityId,
            subjectType: 'STAFF',
            occurredAt: now.toISOString(),
          },
          occurredAt: now,
        },
      });
      await appendAuditEvent(transaction, {
        identityId: invitation.identityId,
        eventType: 'INVITATION_ACCEPTED',
        result: 'SUCCESS',
        ...metadata,
      });
    });
    return { status: IdentityStatus.ACTIVE };
  }

  async createStaffInvitation(
    actorId: string,
    input: CreateStaffInvitationDto,
    metadata: RequestMetadata,
    locale: 'en' | 'fr',
  ): Promise<{ message: string; invitationId: string }> {
    const email = normalizeEmail(input.email);
    const roleCodes = [...new Set(input.roles)];
    const roles = await this.prisma.role.findMany({
      where: { code: { in: roleCodes } },
      include: { permissions: true },
    });
    if (
      roles.length !== roleCodes.length ||
      roles.some((role) => role.code === 'CUSTOMER')
    ) {
      throw new BadRequestException('The requested role set is invalid.');
    }
    for (const role of roles) {
      if (
        role.permissions.some(({ permission }) =>
          SUPER_ADMIN_ONLY_PERMISSIONS.has(permission as Permission),
        ) &&
        role.code !== 'GLOBAL_SUPER_ADMIN'
      ) {
        throw new BadRequestException(
          'Administrative permissions cannot be assigned to non-super-admin roles.',
        );
      }
    }

    const identityId = randomUUID();
    const invitationId = randomUUID();
    const rawToken = this.tokens.createOpaqueToken();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.invitationTtlSeconds * 1000,
    );
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.identity.create({
          data: {
            id: identityId,
            subjectType: 'STAFF',
            email,
            emailNormalized: email,
            phone: normalizePhone(input.phone),
            status: IdentityStatus.PENDING_INVITATION,
            roles: {
              create: roles.map((role) => ({
                roleId: role.id,
                assignedBy: actorId,
              })),
            },
            invitations: {
              create: {
                id: invitationId,
                tokenHash: this.tokens.hashOpaqueToken(rawToken),
                expiresAt,
              },
            },
          },
        });
        await transaction.outboxEvent.create({
          data: {
            id: randomUUID(),
            eventName: 'IdentityInvited',
            payload: {
              eventId: randomUUID(),
              identityId,
              invitedBy: actorId,
              occurredAt: now.toISOString(),
            },
            occurredAt: now,
          },
        });
        await appendAuditEvent(transaction, {
          identityId,
          eventType: 'STAFF_INVITATION_CREATED',
          result: 'SUCCESS',
          ...metadata,
          metadata: { actorId, roles: roleCodes },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          message: INVITATION_MESSAGE,
          invitationId: randomUUID(),
        };
      }
      throw error;
    }

    await this.invitations.send(
      email,
      rawToken,
      Math.ceil(this.config.invitationTtlSeconds / 3600),
      locale,
    );
    return {
      message: INVITATION_MESSAGE,
      invitationId,
    };
  }

  async resendStaffInvitation(
    actorId: string,
    identityId: string,
    metadata: RequestMetadata,
    locale: 'en' | 'fr',
  ): Promise<{ message: string; invitationId: string }> {
    const now = new Date();
    const invitationId = randomUUID();
    const rawToken = this.tokens.createOpaqueToken();
    const expiresAt = new Date(
      now.getTime() + this.config.invitationTtlSeconds * 1000,
    );
    const invitation = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${identityId}))
      `;
      const identity = await transaction.identity.findUnique({
        where: { id: identityId },
        select: { id: true, email: true, subjectType: true, status: true },
      });
      if (
        !identity ||
        identity.subjectType !== 'STAFF' ||
        identity.status !== IdentityStatus.PENDING_INVITATION
      ) {
        throw new ConflictException(
          'Only a pending staff invitation can be resent.',
        );
      }
      await transaction.invitation.updateMany({
        where: { identityId, consumedAt: null },
        data: { consumedAt: now },
      });
      await transaction.invitation.create({
        data: {
          id: invitationId,
          identityId,
          tokenHash: this.tokens.hashOpaqueToken(rawToken),
          expiresAt,
        },
      });
      await appendAuditEvent(transaction, {
        identityId,
        eventType: 'STAFF_INVITATION_RESENT',
        result: 'SUCCESS',
        ...metadata,
        metadata: { actorId },
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'IdentityInvited',
          payload: {
            eventId: randomUUID(),
            identityId,
            invitedBy: actorId,
            resent: true,
            occurredAt: now.toISOString(),
          },
        },
      });
      return identity;
    });

    await this.invitations.send(
      invitation.email,
      rawToken,
      Math.ceil(this.config.invitationTtlSeconds / 3600),
      locale,
    );
    return { message: INVITATION_MESSAGE, invitationId };
  }

  async createCustomRole(
    actorId: string,
    input: CreateCustomRoleDto,
    metadata: RequestMetadata,
  ): Promise<{ code: string; name: string; permissions: string[] }> {
    const permissions = [...new Set(input.permissions)];
    if (
      permissions.some(
        (permission) =>
          !PERMISSION_CATALOG.includes(permission as Permission) ||
          SUPER_ADMIN_ONLY_PERMISSIONS.has(permission as Permission),
      )
    ) {
      throw new BadRequestException(
        'The role contains a permission that is unknown or reserved.',
      );
    }
    const code = `CUSTOM_${input.code.toUpperCase()}`;
    try {
      const role = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.role.create({
          data: {
            id: randomUUID(),
            code,
            name: input.name.trim(),
            builtIn: false,
            permissions: {
              create: permissions.map((permission) => ({ permission })),
            },
          },
          include: { permissions: true },
        });
        await appendAuditEvent(transaction, {
          identityId: actorId,
          eventType: 'CUSTOM_ROLE_CREATED',
          result: 'SUCCESS',
          ...metadata,
          metadata: { roleCode: code, permissions },
        });
        return created;
      });
      return {
        code: role.code,
        name: role.name,
        permissions: role.permissions.map(({ permission }) => permission),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A role with this code already exists.');
      }
      throw error;
    }
  }

  async assignRole(
    actorId: string,
    identityId: string,
    input: AssignRoleDto,
    metadata: RequestMetadata,
  ): Promise<void> {
    if (actorId === identityId) {
      throw new BadRequestException('Self-assignment is not allowed.');
    }
    const [identity, role] = await Promise.all([
      this.prisma.identity.findUnique({ where: { id: identityId } }),
      this.prisma.role.findUnique({
        where: { code: input.roleCode },
        include: { permissions: true },
      }),
    ]);
    if (!identity || !role) {
      throw new NotFoundException('The identity or role was not found.');
    }
    if (
      identity.subjectType !== 'STAFF' ||
      role.code === 'CUSTOMER' ||
      (role.code !== 'GLOBAL_SUPER_ADMIN' &&
        role.permissions.some(({ permission }) =>
          SUPER_ADMIN_ONLY_PERMISSIONS.has(permission as Permission),
        ))
    ) {
      throw new BadRequestException(
        'The requested role assignment is incompatible.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      if (role.code === 'GLOBAL_SUPER_ADMIN') {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext('kgpay-global-admin-invariant'))
        `;
      }
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${identityId}))
      `;
      const currentIdentity = await transaction.identity.findUnique({
        where: { id: identityId },
        select: { subjectType: true, status: true },
      });
      if (
        !currentIdentity ||
        currentIdentity.subjectType !== 'STAFF' ||
        currentIdentity.status === IdentityStatus.DISABLED
      ) {
        throw new BadRequestException(
          'The role cannot be assigned to this identity.',
        );
      }
      const currentAssignment = await transaction.identityRole.findUnique({
        where: { identityId_roleId: { identityId, roleId: role.id } },
      });
      if (currentAssignment) {
        throw new ConflictException('The role is already assigned.');
      }
      await transaction.identityRole.create({
        data: { identityId, roleId: role.id, assignedBy: actorId },
      });
      await appendAuditEvent(transaction, {
        identityId,
        eventType: 'ROLE_ASSIGNED',
        result: 'SUCCESS',
        ...metadata,
        metadata: { actorId, roleCode: role.code },
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'RoleAssigned',
          payload: {
            eventId: randomUUID(),
            identityId,
            roleCode: role.code,
            assignedBy: actorId,
            occurredAt: new Date().toISOString(),
          },
        },
      });
    });
  }

  async revokeRole(
    actorId: string,
    identityId: string,
    roleCode: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    if (actorId === identityId) {
      throw new BadRequestException('Self-assignment is not allowed.');
    }
    const role = await this.prisma.role.findUnique({
      where: { code: roleCode },
    });
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
    });
    if (!role || !identity || identity.subjectType !== 'STAFF') {
      throw new NotFoundException('The identity or role was not found.');
    }
    await this.prisma.$transaction(async (transaction) => {
      if (role.code === 'GLOBAL_SUPER_ADMIN') {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext('kgpay-global-admin-invariant'))
        `;
      }
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${identityId}))
      `;
      const currentIdentity = await transaction.identity.findUnique({
        where: { id: identityId },
        select: { subjectType: true, status: true },
      });
      if (!currentIdentity || currentIdentity.subjectType !== 'STAFF') {
        throw new NotFoundException('The staff identity was not found.');
      }
      if (
        role.code === 'GLOBAL_SUPER_ADMIN' &&
        currentIdentity.status === IdentityStatus.ACTIVE
      ) {
        const activeAdmins = await transaction.identityRole.count({
          where: {
            role: { code: 'GLOBAL_SUPER_ADMIN' },
            identity: { status: IdentityStatus.ACTIVE },
          },
        });
        if (activeAdmins <= 1) {
          throw new ConflictException(
            'The last active global super administrator cannot be removed.',
          );
        }
      }
      const deleted = await transaction.identityRole.deleteMany({
        where: { identityId, roleId: role.id },
      });
      if (!deleted.count) {
        throw new NotFoundException(
          'The role is not assigned to this identity.',
        );
      }
      await appendAuditEvent(transaction, {
        identityId,
        eventType: 'ROLE_REVOKED',
        result: 'SUCCESS',
        ...metadata,
        metadata: { actorId, roleCode },
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'RoleRevoked',
          payload: {
            eventId: randomUUID(),
            identityId,
            roleCode,
            revokedBy: actorId,
            occurredAt: new Date().toISOString(),
          },
        },
      });
    });
  }

  async changeIdentityStatus(
    actorId: string,
    identityId: string,
    action: 'suspend' | 'reactivate' | 'disable' | 'unlock',
    metadata: RequestMetadata,
  ): Promise<{ status: IdentityStatus; lockedUntil: Date | null }> {
    if (action === 'unlock' && actorId === identityId) {
      throw new BadRequestException(
        'An administrator cannot unlock their own identity.',
      );
    }
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext('kgpay-global-admin-invariant'))
      `;
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${identityId}))
      `;
      const identity = await transaction.identity.findUnique({
        where: { id: identityId },
        include: { roles: { include: { role: true } } },
      });
      if (!identity) {
        throw new NotFoundException('The identity was not found.');
      }
      const isSuperAdmin = identity.roles.some(
        ({ role }) => role.code === 'GLOBAL_SUPER_ADMIN',
      );
      if (isSuperAdmin && (action === 'disable' || action === 'suspend')) {
        const activeAdmins = await transaction.identityRole.count({
          where: {
            role: { code: 'GLOBAL_SUPER_ADMIN' },
            identity: { status: IdentityStatus.ACTIVE },
          },
        });
        if (activeAdmins <= 1) {
          throw new ConflictException(
            'The last active global super administrator cannot be changed.',
          );
        }
      }

      let status = identity.status;
      let lockedUntil = identity.lockedUntil;
      let eventType = '';
      if (action === 'suspend') {
        if (status !== IdentityStatus.ACTIVE) {
          throw new ConflictException('The identity cannot be suspended.');
        }
        status = IdentityStatus.SUSPENDED;
        eventType = 'IdentitySuspended';
      } else if (action === 'reactivate') {
        if (status !== IdentityStatus.SUSPENDED || !identity.emailVerifiedAt) {
          throw new ConflictException('The identity cannot be reactivated.');
        }
        status = IdentityStatus.ACTIVE;
        eventType = 'IdentityReactivated';
      } else if (action === 'disable') {
        if (status === IdentityStatus.DISABLED) {
          throw new ConflictException('The identity is already disabled.');
        }
        status = IdentityStatus.DISABLED;
        eventType = 'IdentityDisabled';
      } else {
        if (status === IdentityStatus.DISABLED) {
          throw new ConflictException(
            'A disabled identity cannot be unlocked.',
          );
        }
        lockedUntil = null;
        eventType = 'IDENTITY_UNLOCKED';
      }

      await transaction.identity.update({
        where: { id: identityId },
        data: {
          status,
          lockedUntil,
          ...(action === 'unlock' ? { failedLoginCount: 0 } : {}),
        },
      });
      if (action === 'suspend' || action === 'disable') {
        await transaction.otpChallenge.updateMany({
          where: { identityId, consumedAt: null },
          data: { consumedAt: now },
        });
        await transaction.sessionFamily.updateMany({
          where: { identityId, revokedAt: null },
          data: {
            revokedAt: now,
            revocationReason:
              action === 'disable' ? 'IDENTITY_DISABLED' : 'IDENTITY_SUSPENDED',
          },
        });
        await transaction.outboxEvent.create({
          data: {
            id: randomUUID(),
            eventName: 'SessionRevoked',
            payload: {
              eventId: randomUUID(),
              identityId,
              reason:
                action === 'disable'
                  ? 'IDENTITY_DISABLED'
                  : 'IDENTITY_SUSPENDED',
              occurredAt: now.toISOString(),
            },
          },
        });
      }
      await appendAuditEvent(transaction, {
        identityId,
        eventType,
        result: 'SUCCESS',
        ...metadata,
        metadata: { actorId },
      });
      if (eventType.startsWith('Identity')) {
        await transaction.outboxEvent.create({
          data: {
            id: randomUUID(),
            eventName: eventType,
            payload: {
              eventId: randomUUID(),
              identityId,
              changedBy: actorId,
              occurredAt: now.toISOString(),
            },
          },
        });
      }
      return { status, lockedUntil };
    });
  }

  async listIdentities(query: {
    page: number;
    limit: number;
    search?: string;
    subjectType?: SubjectType;
    status?: string;
  }): Promise<{
    items: unknown[];
    page: number;
    limit: number;
    total: number;
  }> {
    const where: Prisma.IdentityWhereInput = {
      ...(query.subjectType ? { subjectType: query.subjectType } : {}),
      ...(query.status ? { status: query.status as IdentityStatus } : {}),
      ...(query.search
        ? {
            emailNormalized: {
              contains: normalizeEmail(query.search),
              mode: 'insensitive',
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.identity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          subjectType: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { select: { role: { select: { code: true } } } },
        },
      }),
      this.prisma.identity.count({ where }),
    ]);
    return {
      items: items.map((identity) => ({
        ...identity,
        roles: identity.roles.map(({ role }) => role.code),
      })),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async listSessions(identityId: string): Promise<unknown[]> {
    const now = new Date();
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { subjectType: true },
    });
    return this.prisma.sessionFamily.findMany({
      where: {
        identityId,
        revokedAt: null,
        absoluteExpiresAt: { gt: now },
        ...(identity?.subjectType === 'STAFF'
          ? {
              lastActivityAt: {
                gt: new Date(
                  now.getTime() - this.config.staffIdleTtlSeconds * 1000,
                ),
              },
            }
          : {}),
      },
      orderBy: { lastActivityAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        lastActivityAt: true,
        absoluteExpiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });
  }

  async logout(rawToken: string, metadata: RequestMetadata): Promise<void> {
    const tokenHash = this.tokens.hashOpaqueToken(rawToken);
    const now = new Date();
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { familyId: true, family: { select: { identityId: true } } },
    });
    if (!token) {
      return;
    }
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.sessionFamily.updateMany({
        where: { id: token.familyId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'USER_LOGOUT' },
      });
      if (revoked.count !== 1) {
        return;
      }
      await appendAuditEvent(transaction, {
        identityId: token.family.identityId,
        eventType: 'SESSION_LOGOUT',
        result: 'SUCCESS',
        ...metadata,
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'SessionRevoked',
          payload: {
            eventId: randomUUID(),
            identityId: token.family.identityId,
            reason: 'USER_LOGOUT',
            occurredAt: now.toISOString(),
          },
        },
      });
    });
  }

  async revokeSession(
    identityId: string,
    sessionId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const now = new Date();
    const revoked = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.sessionFamily.updateMany({
        where: { id: sessionId, identityId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'USER_REVOKED' },
      });
      if (result.count !== 1) {
        return false;
      }
      await appendAuditEvent(transaction, {
        identityId,
        eventType: 'SESSION_REVOKED',
        result: 'SUCCESS',
        ...metadata,
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'SessionRevoked',
          payload: {
            eventId: randomUUID(),
            identityId,
            sessionId,
            reason: 'USER_REVOKED',
            occurredAt: now.toISOString(),
          },
        },
      });
      return true;
    });
    if (!revoked) {
      throw new NotFoundException('The active session was not found.');
    }
  }

  async revokeAllSessions(
    identityId: string,
    exceptSessionId: string | null,
    metadata: RequestMetadata,
  ): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.sessionFamily.updateMany({
        where: {
          identityId,
          revokedAt: null,
          ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        },
        data: { revokedAt: now, revocationReason: 'USER_REVOKED_ALL' },
      });
      await appendAuditEvent(transaction, {
        identityId,
        eventType: 'SESSIONS_REVOKED',
        result: 'SUCCESS',
        ...metadata,
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'SessionRevoked',
          payload: {
            eventId: randomUUID(),
            identityId,
            exceptSessionId,
            reason: 'USER_REVOKED_ALL',
            occurredAt: now.toISOString(),
          },
        },
      });
    });
  }

  async listAccessEvents(query: {
    page: number;
    limit: number;
    identityId?: string;
  }): Promise<unknown[]> {
    return this.prisma.accessEvent.findMany({
      where: query.identityId ? { identityId: query.identityId } : {},
      orderBy: { occurredAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        identityId: true,
        eventType: true,
        result: true,
        ipAddress: true,
        userAgent: true,
        correlationId: true,
        occurredAt: true,
        metadata: true,
      },
    });
  }

  async accessReview(): Promise<unknown[]> {
    return this.prisma.identity.findMany({
      where: { subjectType: 'STAFF' },
      orderBy: [{ status: 'asc' }, { lastLoginAt: 'asc' }],
      select: {
        id: true,
        email: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { code: true } } } },
      },
    });
  }

  async introspect(sessionId: string): Promise<{
    active: boolean;
    identityId: string | null;
    roles: string[];
  }> {
    const session = await this.prisma.sessionFamily.findUnique({
      where: { id: sessionId },
      include: {
        identity: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
    });
    const active = Boolean(
      session &&
      !session.revokedAt &&
      session.absoluteExpiresAt > new Date() &&
      session.identity.status === IdentityStatus.ACTIVE &&
      session.identity.emailVerifiedAt &&
      (session.identity.subjectType !== 'STAFF' ||
        session.lastActivityAt.getTime() +
          this.config.staffIdleTtlSeconds * 1000 >
          Date.now()),
    );
    return {
      active,
      identityId: session?.identityId ?? null,
      roles: active
        ? (session?.identity.roles.map(({ role }) => role.code) ?? [])
        : [],
    };
  }

  async verifyServiceClient(
    clientId: string,
    secret: string,
  ): Promise<boolean> {
    const client = await this.prisma.serviceClient.findUnique({
      where: { clientId },
    });
    const suppliedHash = createHash('sha256').update(secret).digest('hex');
    const storedHash = client?.secretHash ?? '0'.repeat(64);
    const matches = timingSafeEqual(
      Buffer.from(suppliedHash, 'hex'),
      Buffer.from(storedHash, 'hex'),
    );
    return Boolean(
      client?.active &&
      matches &&
      client.permissions.includes('iam.session.introspect'),
    );
  }

  async refresh(
    rawToken: string,
    metadata: RequestMetadata,
  ): Promise<AuthSessionResult> {
    const tokenHash = this.tokens.hashOpaqueToken(rawToken);
    const now = new Date();
    const transactionResult = await this.prisma.$transaction(
      async (transaction) => {
        const tokenOwner = await transaction.refreshToken.findUnique({
          where: { tokenHash },
          select: { family: { select: { identityId: true } } },
        });
        if (!tokenOwner) {
          return { state: 'invalid' as const };
        }
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${tokenOwner.family.identityId}))
        `;
        const token = await transaction.refreshToken.findUnique({
          where: { tokenHash },
          include: {
            family: {
              include: {
                identity: {
                  include: {
                    roles: {
                      include: {
                        role: { include: { permissions: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (!token) {
          return { state: 'invalid' as const };
        }
        const { family } = token;
        const identity = family.identity;
        if (token.consumedAt) {
          if (!family.revokedAt) {
            await transaction.sessionFamily.update({
              where: { id: family.id },
              data: {
                revokedAt: now,
                revocationReason: 'REFRESH_TOKEN_REUSE',
              },
            });
            await transaction.refreshToken.updateMany({
              where: { familyId: family.id, revokedAt: null },
              data: { revokedAt: now },
            });
            await appendAuditEvent(transaction, {
              identityId: identity.id,
              eventType: 'REFRESH_TOKEN_REUSE_DETECTED',
              result: 'FAMILY_REVOKED',
              ...metadata,
            });
            await transaction.outboxEvent.create({
              data: {
                id: randomUUID(),
                eventName: 'SessionRevoked',
                payload: {
                  eventId: randomUUID(),
                  identityId: identity.id,
                  sessionId: family.id,
                  reason: 'REFRESH_TOKEN_REUSE',
                  occurredAt: now.toISOString(),
                },
              },
            });
          }
          return { state: 'replay' as const };
        }
        if (
          token.revokedAt ||
          token.expiresAt <= now ||
          family.revokedAt ||
          family.absoluteExpiresAt <= now ||
          identity.status !== IdentityStatus.ACTIVE ||
          !identity.emailVerifiedAt ||
          (identity.subjectType === 'STAFF' &&
            family.lastActivityAt.getTime() +
              this.config.staffIdleTtlSeconds * 1000 <=
              now.getTime())
        ) {
          return { state: 'invalid' as const };
        }

        const consumed = await transaction.refreshToken.updateMany({
          where: {
            id: token.id,
            consumedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) {
          await transaction.sessionFamily.update({
            where: { id: family.id },
            data: {
              revokedAt: now,
              revocationReason: 'REFRESH_TOKEN_REUSE',
            },
          });
          await appendAuditEvent(transaction, {
            identityId: identity.id,
            eventType: 'REFRESH_TOKEN_REUSE_DETECTED',
            result: 'FAMILY_REVOKED',
            ...metadata,
          });
          await transaction.refreshToken.updateMany({
            where: { familyId: family.id, revokedAt: null },
            data: { revokedAt: now },
          });
          await transaction.outboxEvent.create({
            data: {
              id: randomUUID(),
              eventName: 'SessionRevoked',
              payload: {
                eventId: randomUUID(),
                identityId: identity.id,
                sessionId: family.id,
                reason: 'REFRESH_TOKEN_REUSE',
                occurredAt: now.toISOString(),
              },
            },
          });
          return { state: 'replay' as const };
        }

        const isCustomer = identity.subjectType === 'CUSTOMER';
        const absoluteExpiresAt = isCustomer
          ? new Date(
              now.getTime() + this.config.customerRefreshTtlDays * 86400_000,
            )
          : family.absoluteExpiresAt;
        const idleExpiresAt = isCustomer
          ? absoluteExpiresAt
          : new Date(now.getTime() + this.config.staffIdleTtlSeconds * 1000);
        const nextTokenExpiry = new Date(
          Math.min(absoluteExpiresAt.getTime(), idleExpiresAt.getTime()),
        );
        const nextRefreshToken = this.tokens.createOpaqueToken();
        await transaction.sessionFamily.update({
          where: { id: family.id },
          data: { lastActivityAt: now, absoluteExpiresAt },
        });
        await transaction.refreshToken.create({
          data: {
            id: randomUUID(),
            familyId: family.id,
            tokenHash: this.tokens.hashOpaqueToken(nextRefreshToken),
            expiresAt: nextTokenExpiry,
          },
        });
        return {
          state: 'ok' as const,
          sessionId: family.id,
          identity,
          absoluteExpiresAt,
          nextRefreshToken,
          nextTokenExpiry,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (transactionResult.state === 'replay') {
      throw new UnauthorizedException('The session has been revoked.');
    }
    if (transactionResult.state !== 'ok') {
      throw new UnauthorizedException(
        'The refresh token is invalid or expired.',
      );
    }
    const roles = transactionResult.identity.roles.map(({ role }) => role.code);
    return {
      accessToken: this.tokens.issueAccessToken({
        identityId: transactionResult.identity.id,
        sessionId: transactionResult.sessionId,
        subjectType: transactionResult.identity.subjectType,
        roles,
        permissions: permissionsFor(transactionResult.identity),
      }),
      refreshToken: transactionResult.nextRefreshToken,
      refreshExpiresAt: transactionResult.nextTokenExpiry,
      expiresIn: this.config.accessTokenTtlSeconds,
      sessionId: transactionResult.sessionId,
      subjectType: transactionResult.identity.subjectType,
      roles,
    };
  }

  async requestStepUp(
    auth: AuthContext,
    action: string,
    challengeId: string | undefined,
    code: string | undefined,
    locale: 'en' | 'fr',
    metadata: RequestMetadata,
  ): Promise<{ challengeId: string } | { proof: string; expiresIn: number }> {
    if (!SENSITIVE_ACTIONS.has(action)) {
      throw new BadRequestException(
        'The requested step-up action is not supported.',
      );
    }
    if (!challengeId && !code) {
      const identity = await this.prisma.identity.findUniqueOrThrow({
        where: { id: auth.identityId },
        select: { id: true, email: true },
      });
      const challenge = await this.otp.issue(
        identity,
        OtpPurpose.STEP_UP,
        action,
        locale,
        metadata,
      );
      return { challengeId: challenge.challengeId };
    }
    if (!challengeId || !code) {
      throw new BadRequestException(
        'Both challengeId and code are required to complete step-up.',
      );
    }
    const consumed = await this.otp.consume(
      challengeId,
      code,
      OtpPurpose.STEP_UP,
      action,
      metadata,
    );
    if (consumed.identityId !== auth.identityId || consumed.action !== action) {
      throw new UnauthorizedException('The step-up proof is invalid.');
    }
    return {
      proof: await this.tokens.issueStepUpProof({
        identityId: auth.identityId,
        sessionId: auth.sessionId,
        action,
      }),
      expiresIn: this.config.stepUpTtlSeconds,
    };
  }

  async requestEmailChange(
    auth: AuthContext,
    newEmail: string,
    locale: 'en' | 'fr',
    metadata: RequestMetadata,
  ): Promise<{ challengeId: string }> {
    const normalizedEmail = normalizeEmail(newEmail);
    const current = await this.prisma.identity.findUniqueOrThrow({
      where: { id: auth.identityId },
      select: { emailNormalized: true, id: true, emailVerifiedAt: true },
    });
    if (
      normalizedEmail === current.emailNormalized ||
      !current.emailVerifiedAt
    ) {
      throw new BadRequestException('The requested email change is invalid.');
    }
    const existing = await this.prisma.identity.findUnique({
      where: { emailNormalized: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'The requested email address is unavailable.',
      );
    }
    const action = `email-change:${auth.identityId}:${normalizedEmail}:${auth.sessionId}`;
    const challenge = await this.otp.issue(
      { id: current.id, email: normalizedEmail },
      OtpPurpose.STEP_UP,
      action,
      locale,
      metadata,
    );
    await this.audit.record({
      identityId: auth.identityId,
      eventType: 'EMAIL_CHANGE_REQUESTED',
      result: 'OTP_SENT_TO_NEW_ADDRESS',
      ...metadata,
    });
    return { challengeId: challenge.challengeId };
  }

  async verifyEmailChange(
    auth: AuthContext,
    input: UpdateEmailDto,
    metadata: RequestMetadata,
  ): Promise<void> {
    const normalizedEmail = normalizeEmail(input.newEmail);
    const consumed = await this.otp.consume(
      input.challengeId,
      input.code,
      OtpPurpose.STEP_UP,
      `email-change:${auth.identityId}:${normalizedEmail}:${auth.sessionId}`,
      metadata,
    );
    if (consumed.identityId !== auth.identityId) {
      throw new UnauthorizedException('The email change proof is invalid.');
    }
    const now = new Date();
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${auth.identityId}))
        `;
        const current = await transaction.identity.findUnique({
          where: { id: auth.identityId },
          select: { status: true, emailNormalized: true },
        });
        if (
          !current ||
          current.status !== IdentityStatus.ACTIVE ||
          current.emailNormalized === normalizedEmail
        ) {
          throw new ConflictException('The requested email change is invalid.');
        }
        await transaction.identity.update({
          where: { id: auth.identityId },
          data: {
            email: normalizedEmail,
            emailNormalized: normalizedEmail,
            emailVerifiedAt: now,
          },
        });
        await transaction.sessionFamily.updateMany({
          where: {
            identityId: auth.identityId,
            revokedAt: null,
            id: { not: auth.sessionId },
          },
          data: { revokedAt: now, revocationReason: 'EMAIL_CHANGED' },
        });
        await transaction.otpChallenge.updateMany({
          where: { identityId: auth.identityId, consumedAt: null },
          data: { consumedAt: now },
        });
        await appendAuditEvent(transaction, {
          identityId: auth.identityId,
          eventType: 'EMAIL_CHANGED',
          result: 'SUCCESS',
          ...metadata,
        });
        await transaction.outboxEvent.create({
          data: {
            id: randomUUID(),
            eventName: 'SessionRevoked',
            payload: {
              eventId: randomUUID(),
              identityId: auth.identityId,
              exceptSessionId: auth.sessionId,
              reason: 'EMAIL_CHANGED',
              occurredAt: now.toISOString(),
            },
            occurredAt: now,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'The requested email address is unavailable.',
        );
      }
      throw error;
    }
  }

  async changePhoneContact(
    auth: AuthContext,
    phoneInput: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const phone = normalizePhone(phoneInput);
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${auth.identityId}))
      `;
      const current = await transaction.identity.findUnique({
        where: { id: auth.identityId },
        select: { phone: true, status: true },
      });
      if (
        !current ||
        current.status !== IdentityStatus.ACTIVE ||
        current.phone === phone
      ) {
        throw new ConflictException('The requested contact change is invalid.');
      }
      await transaction.identity.update({
        where: { id: auth.identityId },
        data: { phone },
      });
      await transaction.sessionFamily.updateMany({
        where: {
          identityId: auth.identityId,
          revokedAt: null,
          id: { not: auth.sessionId },
        },
        data: { revokedAt: now, revocationReason: 'CONTACT_CHANGED' },
      });
      await appendAuditEvent(transaction, {
        identityId: auth.identityId,
        eventType: 'PHONE_CONTACT_CHANGED',
        result: 'SUCCESS',
        ...metadata,
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'SessionRevoked',
          payload: {
            eventId: randomUUID(),
            identityId: auth.identityId,
            exceptSessionId: auth.sessionId,
            reason: 'CONTACT_CHANGED',
            occurredAt: now.toISOString(),
          },
        },
      });
    });
  }

  async consumeStepUpProof(
    proof: string,
    auth: AuthContext,
    action: string,
  ): Promise<boolean> {
    const claims = this.tokens.verifyStepUpProof(proof);
    if (
      claims.sub !== auth.identityId ||
      claims.sid !== auth.sessionId ||
      claims.act !== action
    ) {
      return false;
    }
    const consumed = await this.prisma.stepUpProof.updateMany({
      where: {
        jti: claims.jti,
        identityId: auth.identityId,
        sessionId: auth.sessionId,
        action,
        expiresAt: { gt: new Date() },
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
    return consumed.count === 1;
  }

  async markStaffEmailChange(
    identityId: string,
    actorId: string,
    newEmail: string,
    challengeId: string,
    code: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    if (identityId === actorId) {
      throw new BadRequestException(
        'A super administrator cannot recover their own staff email.',
      );
    }
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { subjectType: true },
    });
    if (!identity || identity.subjectType !== 'STAFF') {
      throw new BadRequestException(
        'This operation is available only for staff identity recovery.',
      );
    }
    const normalizedEmail = normalizeEmail(newEmail);
    const consumed = await this.otp.consume(
      challengeId,
      code,
      OtpPurpose.STEP_UP,
      `staff-email:${identityId}:${normalizedEmail}`,
      metadata,
    );
    if (consumed.identityId !== identityId) {
      throw new UnauthorizedException('The email change proof is invalid.');
    }
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${identityId}))
        `;
        await transaction.identity.update({
          where: { id: identityId },
          data: {
            email: normalizedEmail,
            emailNormalized: normalizedEmail,
            emailVerifiedAt: new Date(),
          },
        });
        await transaction.sessionFamily.updateMany({
          where: { identityId, revokedAt: null },
          data: { revokedAt: new Date(), revocationReason: 'EMAIL_CHANGED' },
        });
        await transaction.otpChallenge.updateMany({
          where: { identityId, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        await appendAuditEvent(transaction, {
          identityId,
          eventType: 'STAFF_EMAIL_CHANGED',
          result: 'SUCCESS',
          ...metadata,
          metadata: { actorId },
        });
        await transaction.outboxEvent.create({
          data: {
            id: randomUUID(),
            eventName: 'SessionRevoked',
            payload: {
              eventId: randomUUID(),
              identityId,
              reason: 'EMAIL_CHANGED',
              occurredAt: new Date().toISOString(),
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'The requested email address is unavailable.',
        );
      }
      throw error;
    }
  }

  async issueStaffEmailRecovery(
    actorId: string,
    identityId: string,
    newEmail: string,
    locale: 'en' | 'fr',
    metadata: RequestMetadata,
  ): Promise<{ challengeId: string }> {
    if (actorId === identityId) {
      throw new BadRequestException(
        'A super administrator cannot recover their own staff email.',
      );
    }
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { id: true, subjectType: true },
    });
    if (!identity || identity.subjectType !== 'STAFF') {
      throw new BadRequestException(
        'Only a STAFF identity can use this recovery flow.',
      );
    }
    const normalizedEmail = normalizeEmail(newEmail);
    const existing = await this.prisma.identity.findUnique({
      where: { emailNormalized: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'The requested email address is unavailable.',
      );
    }
    const challenge = await this.otp.issue(
      { id: identity.id, email: normalizedEmail },
      OtpPurpose.STEP_UP,
      `staff-email:${identityId}:${normalizedEmail}`,
      locale,
      metadata,
    );
    await this.audit.record({
      identityId,
      eventType: 'STAFF_EMAIL_RECOVERY_STARTED',
      result: 'OTP_SENT',
      ...metadata,
      metadata: { actorId },
    });
    return { challengeId: challenge.challengeId };
  }

  async listRoles(): Promise<
    Array<{
      code: string;
      name: string;
      builtIn: boolean;
      permissions: string[];
    }>
  > {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ builtIn: 'desc' }, { code: 'asc' }],
      include: { permissions: true },
    });
    return roles.map((role) => ({
      code: role.code,
      name: role.name,
      builtIn: role.builtIn,
      permissions: role.permissions.map(({ permission }) => permission),
    }));
  }

  async revokeSessionByAdmin(
    actorId: string,
    identityId: string,
    sessionId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const now = new Date();
    const result = await this.prisma.$transaction(async (transaction) => {
      const update = await transaction.sessionFamily.updateMany({
        where: { id: sessionId, identityId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'ADMIN_REVOKED' },
      });
      if (!update.count) {
        return false;
      }
      await appendAuditEvent(transaction, {
        identityId,
        eventType: 'SESSION_REVOKED_BY_ADMIN',
        result: 'SUCCESS',
        ...metadata,
        metadata: { actorId, sessionId },
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'SessionRevoked',
          payload: {
            eventId: randomUUID(),
            identityId,
            sessionId,
            revokedBy: actorId,
            reason: 'ADMIN_REVOKED',
            occurredAt: now.toISOString(),
          },
        },
      });
      return true;
    });
    if (!result) {
      throw new NotFoundException('The active session was not found.');
    }
  }

  private async createSession(
    transaction: Prisma.TransactionClient,
    identity: IdentityWithRoles,
    metadata: RequestMetadata,
  ): Promise<AuthSessionResult> {
    const now = new Date();
    const isCustomer = identity.subjectType === 'CUSTOMER';
    const sessionLimit = isCustomer
      ? this.config.customerSessionLimit
      : this.config.staffSessionLimit;
    const idleCutoff = new Date(
      now.getTime() - this.config.staffIdleTtlSeconds * 1000,
    );
    const sessionId = randomUUID();
    const refreshToken = this.tokens.createOpaqueToken();
    const refreshTokenHash = this.tokens.hashOpaqueToken(refreshToken);
    const absoluteExpiresAt = isCustomer
      ? new Date(now.getTime() + this.config.customerRefreshTtlDays * 86400_000)
      : new Date(now.getTime() + this.config.staffRefreshTtlSeconds * 1000);
    const refreshExpiresAt = isCustomer
      ? absoluteExpiresAt
      : new Date(
          Math.min(
            absoluteExpiresAt.getTime(),
            now.getTime() + this.config.staffIdleTtlSeconds * 1000,
          ),
        );
    const permissions = permissionsFor(identity);
    const roles = identity.roles.map(({ role }) => role.code);
    const accessToken = this.tokens.issueAccessToken({
      identityId: identity.id,
      sessionId,
      subjectType: identity.subjectType,
      roles,
      permissions,
    });

    const activeSessions = await transaction.sessionFamily.count({
      where: {
        identityId: identity.id,
        revokedAt: null,
        absoluteExpiresAt: { gt: now },
        ...(isCustomer ? {} : { lastActivityAt: { gt: idleCutoff } }),
      },
    });
    if (activeSessions >= sessionLimit) {
      throw new ConflictException(
        'The simultaneous session limit has been reached.',
      );
    }
    await transaction.sessionFamily.create({
      data: {
        id: sessionId,
        identityId: identity.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        createdAt: now,
        lastActivityAt: now,
        absoluteExpiresAt,
        refreshTokens: {
          create: {
            id: randomUUID(),
            tokenHash: refreshTokenHash,
            expiresAt: refreshExpiresAt,
          },
        },
      },
    });
    await transaction.identity.update({
      where: { id: identity.id },
      data: { lastLoginAt: now },
    });
    await appendAuditEvent(transaction, {
      identityId: identity.id,
      eventType: 'LOGIN_SUCCEEDED',
      result: 'SUCCESS',
      ...metadata,
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenTtlSeconds,
      sessionId,
      subjectType: identity.subjectType,
      refreshExpiresAt,
      roles,
    };
  }

  private hashIp(ipAddress: string | null): string {
    return createHmac('sha256', this.ipHashKey)
      .update(ipAddress ?? 'unknown')
      .digest('hex');
  }

  private async recordFailedCredential(
    identityId: string | undefined,
    metadata: RequestMetadata,
    now: Date,
  ): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        if (identityId) {
          await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${identityId}))
        `;
          const identity = await transaction.identity.findUnique({
            where: { id: identityId },
            select: {
              failedLoginCount: true,
              lockoutCount: true,
              lockedUntil: true,
            },
          });
          if (identity) {
            let failedLoginCount = identity.failedLoginCount + 1;
            let lockoutCount = identity.lockoutCount;
            let identityLockedUntil =
              identity.lockedUntil && identity.lockedUntil > now
                ? identity.lockedUntil
                : null;
            if (failedLoginCount >= this.config.loginFailuresBeforeLock) {
              const duration = Math.min(
                this.config.loginLockBaseSeconds * 2 ** lockoutCount,
                this.config.loginLockMaxSeconds,
              );
              lockoutCount += 1;
              failedLoginCount = 0;
              identityLockedUntil = new Date(now.getTime() + duration * 1000);
            }
            await transaction.identity.update({
              where: { id: identityId },
              data: {
                failedLoginCount,
                lockoutCount,
                lockedUntil: identityLockedUntil,
              },
            });
            if (
              identityLockedUntil &&
              identityLockedUntil.getTime() >
                (identity.lockedUntil?.getTime() ?? 0)
            ) {
              await appendAuditEvent(transaction, {
                identityId,
                eventType: 'IDENTITY_LOCKED',
                result: 'LOCKED',
                ...metadata,
                metadata: {
                  lockedUntil: identityLockedUntil.toISOString(),
                  lockoutCount,
                },
              });
            }
          }
        }
        await appendAuditEvent(transaction, {
          identityId: identityId ?? null,
          eventType: 'LOGIN_FAILED',
          result: 'REJECTED',
          ...metadata,
          metadata: { reason: 'CREDENTIALS_REJECTED' },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async recordLoginFailure(
    identityId: string | undefined,
    metadata: RequestMetadata,
    reason: string,
  ): Promise<void> {
    await this.audit.record({
      identityId: identityId ?? null,
      eventType: 'LOGIN_FAILED',
      result: 'REJECTED',
      ...metadata,
      metadata: { reason },
    });
  }

  private async reserveIpLoginAttempt(
    ipHash: string,
    now: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${ipHash}))
      `;
        const current = await transaction.ipLoginAttempt.findUnique({
          where: { ipHash },
        });
        if (current?.lockedUntil && current.lockedUntil > now) {
          return false;
        }

        const windowExpired =
          !current ||
          current.windowStartedAt.getTime() +
            this.config.loginIpWindowSeconds * 1000 <=
            now.getTime();
        const windowStartedAt = windowExpired ? now : current.windowStartedAt;
        const attemptCount = windowExpired ? 1 : current.attemptCount + 1;
        const lockedUntil =
          attemptCount >= this.config.loginIpMaxAttempts
            ? new Date(
                windowStartedAt.getTime() +
                  this.config.loginIpWindowSeconds * 1000,
              )
            : null;
        await transaction.ipLoginAttempt.upsert({
          where: { ipHash },
          create: { ipHash, windowStartedAt, attemptCount, lockedUntil },
          update: { windowStartedAt, attemptCount, lockedUntil },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export const SENSITIVE_ACTIONS = new Set([
  'iam.identity.create',
  'iam.role.assign',
  'iam.role.revoke',
  'iam.identity.suspend',
  'iam.identity.reactivate',
  'iam.identity.disable',
  'iam.identity.unlock',
  'iam.session.revoke',
  'iam.identity.email-recovery',
  'iam.identity.email-change',
  'iam.identity.phone-change',
]);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  const normalized = phone.trim();
  if (normalized.length < 3 || normalized.length > 32) {
    throw new BadRequestException('The phone contact is invalid.');
  }
  return normalized;
}

function credentialVersionFor(identity: {
  passwordChangedAt: Date | null;
  emailNormalized: string;
}): string {
  return `${identity.passwordChangedAt?.toISOString() ?? ''}:${identity.emailNormalized}`;
}

function permissionsFor(identity: IdentityWithRoles): Permission[] {
  return [
    ...new Set(
      identity.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission as Permission),
      ),
    ),
  ];
}
