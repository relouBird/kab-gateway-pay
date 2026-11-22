import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from '../security/token.service';
import { AuthService } from '../auth/auth.service';
import { AUTH_CONFIG, type AuthConfig } from '../config/auth.config';
import { AuditService } from '../security/audit.service';
import { getRequestMetadata } from './request-context';
import { REQUIRED_PERMISSIONS, REQUIRED_STEP_UP_ACTION } from './decorators';
import type { AuthenticatedRequest } from './auth-context';
import { PERMISSION_CATALOG, type Permission } from '@kgpay/contracts';

function isPermission(permission: string): permission is Permission {
  return (PERMISSION_CATALOG as readonly string[]).includes(permission);
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const claims = this.tokens.verifyAccessToken(match[1]);
    const session = await this.prisma.sessionFamily.findFirst({
      where: {
        id: claims.sid,
        identityId: claims.sub,
        revokedAt: null,
        absoluteExpiresAt: { gt: new Date() },
      },
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
    });
    if (
      !session ||
      session.identity.status !== 'ACTIVE' ||
      !session.identity.emailVerifiedAt
    ) {
      throw new UnauthorizedException('The session is no longer active.');
    }
    const now = new Date();
    if (
      session.identity.subjectType === 'STAFF' &&
      session.lastActivityAt.getTime() +
        this.config.staffIdleTtlSeconds * 1000 <=
        now.getTime()
    ) {
      throw new UnauthorizedException('The session is no longer active.');
    }
    if (
      session.identity.subjectType !== claims.typ ||
      session.identity.id !== claims.sub
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }
    const activityUpdated = await this.prisma.sessionFamily.updateMany({
      where: {
        id: session.id,
        identityId: session.identity.id,
        revokedAt: null,
        absoluteExpiresAt: { gt: now },
      },
      data: { lastActivityAt: now },
    });
    if (activityUpdated.count !== 1) {
      throw new UnauthorizedException('The session is no longer active.');
    }

    const permissions = [
      ...new Set(
        session.identity.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission),
        ),
      ),
    ].map((permission) => {
      if (!isPermission(permission)) {
        throw new UnauthorizedException(
          'The assigned permissions are invalid.',
        );
      }
      return permission;
    });

    request.auth = {
      identityId: session.identity.id,
      sessionId: session.id,
      subjectType: session.identity.subjectType,
      email: session.identity.email,
      roles: session.identity.roles.map(({ role }) => role.code),
      permissions,
    };
    return true;
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<import('@kgpay/contracts').Permission[]>(
        REQUIRED_PERMISSIONS,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    if (!required.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      !required.every((permission) =>
        request.auth.permissions.includes(permission),
      )
    ) {
      await this.audit.record({
        identityId: request.auth.identityId,
        eventType: 'AUTHORIZATION_DENIED',
        result: 'PERMISSION_DENIED',
        ...getRequestMetadata(request),
        metadata: { requiredPermissions: required },
      });
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<string>(
      REQUIRED_STEP_UP_ACTION,
      [context.getHandler(), context.getClass()],
    );
    if (!action) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const proof = request.header('x-step-up-proof');
    if (!proof) {
      await this.recordStepUpFailure(request, action, 'PROOF_REQUIRED');
      throw new ForbiddenException('A recent step-up proof is required.');
    }
    let valid = false;
    try {
      valid = await this.auth.consumeStepUpProof(proof, request.auth, action);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }
    }
    if (!valid) {
      await this.recordStepUpFailure(request, action, 'PROOF_REJECTED');
      throw new ForbiddenException('The step-up proof is invalid or expired.');
    }
    return true;
  }

  private recordStepUpFailure(
    request: AuthenticatedRequest,
    action: string,
    reason: string,
  ): Promise<void> {
    return this.audit.record({
      identityId: request.auth.identityId,
      eventType: 'STEP_UP_FAILED',
      result: 'REJECTED',
      ...getRequestMetadata(request),
      metadata: { action, reason },
    });
  }
}
