import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { OtpPurpose } from '@prisma/client';
import { EmailOtpService } from '../email-otp/email-otp.service';
import { PrismaService } from '../database/prisma.service';
import type { AuthConfig } from '../config/auth.config';
import { appendAuditEvent, AuditService } from '../security/audit.service';
import type { RequestMetadata } from '../common/request-context';

export interface IssuedOtp {
  challengeId: string;
  expiresAt: Date;
}

export interface ConsumedOtp {
  identityId: string;
  purpose: OtpPurpose;
  action: string | null;
  credentialVersion: string | null;
}

function hashOtp(key: string, salt: string, code: string): string {
  return createHmac('sha256', key)
    .update(salt)
    .update(':')
    .update(code)
    .digest('hex');
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailOtpService,
    private readonly config: AuthConfig,
    private readonly audit: AuditService,
  ) {}

  async issue(
    identity: { id: string; email: string },
    purpose: OtpPurpose,
    action: string | null,
    locale: 'en' | 'fr',
    metadata: RequestMetadata = defaultMetadata(),
    credentialVersion: string | null = null,
  ): Promise<IssuedOtp> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const code = randomInt(0, 10 ** this.config.otpLength)
      .toString()
      .padStart(this.config.otpLength, '0');
    const codeSalt = randomUUID().replace(/-/g, '');
    const expiresAt = new Date(
      now.getTime() + this.config.otpTtlSeconds * 1000,
    );
    const challengeId = randomUUID();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${identity.id}), hashtext(${purpose}))::text
      `;
      const mostRecent = await transaction.otpChallenge.findFirst({
        where: {
          identityId: identity.id,
          purpose,
          sentAt: { gte: hourAgo },
        },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      });
      const sendCount = await transaction.otpChallenge.count({
        where: {
          identityId: identity.id,
          purpose,
          sentAt: { gte: hourAgo },
        },
      });
      if (
        mostRecent &&
        now.getTime() - mostRecent.sentAt.getTime() <
          this.config.otpResendCooldownSeconds * 1000
      ) {
        throw new HttpException(
          'Please wait before requesting another code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (sendCount >= this.config.otpMaxSendsPerHour) {
        throw new HttpException(
          'The code request limit has been reached.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await transaction.otpChallenge.updateMany({
        where: {
          identityId: identity.id,
          purpose,
          consumedAt: null,
        },
        data: { consumedAt: now },
      });
      await transaction.otpChallenge.create({
        data: {
          id: challengeId,
          identityId: identity.id,
          targetEmail: identity.email,
          purpose,
          action,
          credentialVersion,
          codeSalt,
          codeHash: hashOtp(this.config.otpHashKey, codeSalt, code),
          expiresAt,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventName: 'OtpRequested',
          payload: {
            eventId: randomUUID(),
            identityId: identity.id,
            purpose,
            occurredAt: now.toISOString(),
          },
        },
      });
      await appendAuditEvent(transaction, {
        identityId: identity.id,
        eventType: 'OTP_REQUESTED',
        result: purpose,
        ...metadata,
      });
    });

    try {
      await this.email.send({
        to: identity.email,
        code,
        purpose: purpose.toLowerCase() as
          'contact_verification' | 'login' | 'password_recovery' | 'step_up',
        locale,
        expiresInMinutes: Math.ceil(this.config.otpTtlSeconds / 60),
      });
    } catch {
      await this.prisma.otpChallenge.updateMany({
        where: { id: challengeId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await this.audit.record({
        identityId: identity.id,
        eventType: 'OTP_DELIVERY_FAILED',
        result: purpose,
        ...metadata,
      });
      throw new ServiceUnavailableException(
        'The verification email could not be sent.',
      );
    }
    return { challengeId, expiresAt };
  }

  async resend(
    challengeId: string,
    locale: 'en' | 'fr',
    metadata: RequestMetadata = defaultMetadata(),
  ): Promise<IssuedOtp> {
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { id: challengeId },
      select: {
        purpose: true,
        action: true,
        credentialVersion: true,
        consumedAt: true,
        expiresAt: true,
        identity: {
          select: { id: true, status: true },
        },
        targetEmail: true,
      },
    });
    if (
      !challenge ||
      challenge.identity.status !==
        (challenge.purpose === OtpPurpose.CONTACT_VERIFICATION
          ? 'PENDING_VERIFICATION'
          : 'ACTIVE')
    ) {
      throw new BadRequestException(
        'The verification challenge is invalid or expired.',
      );
    }
    return this.issue(
      { id: challenge.identity.id, email: challenge.targetEmail },
      challenge.purpose,
      challenge.action,
      locale,
      metadata,
      challenge.credentialVersion,
    );
  }

  async consume(
    challengeId: string,
    code: string,
    purpose: OtpPurpose,
    action?: string,
    metadata: RequestMetadata = defaultMetadata(),
  ): Promise<ConsumedOtp> {
    const now = new Date();
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        identityId: true,
        purpose: true,
        action: true,
        credentialVersion: true,
        codeSalt: true,
        codeHash: true,
        attempts: true,
        expiresAt: true,
        consumedAt: true,
      },
    });
    if (
      !challenge ||
      challenge.purpose !== purpose ||
      (action !== undefined && challenge.action !== action) ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.attempts >= this.config.otpMaxAttempts
    ) {
      await this.audit.record({
        identityId: challenge?.identityId ?? null,
        eventType: 'OTP_VERIFICATION_FAILED',
        result: purpose,
        ...metadata,
        metadata: { reason: 'INVALID_OR_EXPIRED' },
      });
      throw new BadRequestException(
        'The verification code is invalid or expired.',
      );
    }

    const expected = Buffer.from(challenge.codeHash, 'hex');
    const supplied = Buffer.from(
      hashOtp(this.config.otpHashKey, challenge.codeSalt, code),
      'hex',
    );
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      await this.prisma.otpChallenge.updateMany({
        where: {
          id: challengeId,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: this.config.otpMaxAttempts },
        },
        data: { attempts: { increment: 1 } },
      });
      await this.audit.record({
        identityId: challenge.identityId,
        eventType: 'OTP_VERIFICATION_FAILED',
        result: purpose,
        ...metadata,
        metadata: { reason: 'CODE_REJECTED' },
      });
      throw new BadRequestException(
        'The verification code is invalid or expired.',
      );
    }

    const consumed = await this.prisma.otpChallenge.updateMany({
      where: {
        id: challengeId,
        purpose,
        codeHash: challenge.codeHash,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: this.config.otpMaxAttempts },
        ...(action === undefined ? {} : { action }),
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      await this.audit.record({
        identityId: challenge.identityId,
        eventType: 'OTP_VERIFICATION_FAILED',
        result: purpose,
        ...metadata,
        metadata: { reason: 'REPLAY_OR_EXPIRED' },
      });
      throw new BadRequestException(
        'The verification code is invalid or expired.',
      );
    }
    await this.audit.record({
      identityId: challenge.identityId,
      eventType: 'OTP_VERIFIED',
      result: purpose,
      ...metadata,
    });
    return {
      identityId: challenge.identityId,
      purpose: challenge.purpose,
      action: challenge.action,
      credentialVersion: challenge.credentialVersion,
    };
  }
}

function defaultMetadata(): RequestMetadata {
  return { correlationId: randomUUID(), ipAddress: null, userAgent: null };
}
