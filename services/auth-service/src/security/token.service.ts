import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import {
  PERMISSION_CATALOG,
  PERMISSION_CATALOG_VERSION,
  type Permission,
  type SubjectType,
} from '@kgpay/contracts';
import { PrismaService } from '../database/prisma.service';
import type { AuthConfig } from '../config/auth.config';

export interface AccessClaims extends JwtPayload {
  sub: string;
  sid: string;
  typ: SubjectType;
  roles: string[];
  permissions: Permission[];
  pv: number;
  amr: ['pwd', 'otp'];
}

export interface StepUpClaims extends JwtPayload {
  sub: string;
  sid: string;
  act: string;
  jti: string;
  typ: 'stepup';
}

@Injectable()
export class TokenService {
  private readonly signingSecret: string;
  private readonly verificationSecrets: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AuthConfig,
  ) {
    const signingSecret = process.env.JWT_SIGNING_SECRET;
    if (
      !signingSecret ||
      signingSecret !== signingSecret.trim() ||
      !/^[A-Za-z0-9_-]{64,}$/.test(signingSecret)
    ) {
      throw new Error(
        'JWT_SIGNING_SECRET must be a base64url secret of at least 64 characters.',
      );
    }
    this.signingSecret = signingSecret;

    const rawPreviousSecrets =
      process.env.JWT_SIGNING_PREVIOUS_SECRETS_JSON?.trim();
    let previousSecrets: unknown = [];
    try {
      previousSecrets = rawPreviousSecrets
        ? JSON.parse(rawPreviousSecrets)
        : [];
    } catch {
      throw new Error(
        'JWT_SIGNING_PREVIOUS_SECRETS_JSON must be a JSON array.',
      );
    }
    if (!Array.isArray(previousSecrets)) {
      throw new Error(
        'JWT_SIGNING_PREVIOUS_SECRETS_JSON must be a JSON array.',
      );
    }

    for (const secret of previousSecrets) {
      if (
        typeof secret !== 'string' ||
        !/^[A-Za-z0-9_-]{64,}$/.test(secret) ||
        secret === signingSecret
      ) {
        throw new Error(
          'Each previous JWT signing secret must be a distinct base64url secret of at least 64 characters.',
        );
      }
    }
    if (new Set(previousSecrets).size !== previousSecrets.length) {
      throw new Error('JWT signing secrets must be unique.');
    }
    this.verificationSecrets = [signingSecret, ...previousSecrets];
  }

  issueAccessToken(input: {
    identityId: string;
    sessionId: string;
    subjectType: SubjectType;
    roles: string[];
    permissions: Permission[];
  }): string {
    return jwt.sign(
      {
        sid: input.sessionId,
        typ: input.subjectType,
        roles: input.roles,
        permissions: input.permissions,
        pv: PERMISSION_CATALOG_VERSION,
        amr: ['pwd', 'otp'],
      },
      this.signingSecret,
      {
        algorithm: 'HS256',
        issuer: this.config.issuer,
        audience: this.config.audience,
        subject: input.identityId,
        jwtid: randomUUID(),
        expiresIn: this.config.accessTokenTtlSeconds,
      },
    );
  }

  verifyAccessToken(token: string): AccessClaims {
    const claims = this.verify(token);
    if (
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string' ||
      (claims.typ !== 'CUSTOMER' && claims.typ !== 'STAFF') ||
      claims.pv !== PERMISSION_CATALOG_VERSION ||
      !Array.isArray(claims.roles) ||
      !claims.roles.every(
        (role) => typeof role === 'string' && role.length > 0,
      ) ||
      !Array.isArray(claims.permissions) ||
      !claims.permissions.every((permission) =>
        PERMISSION_CATALOG.includes(permission as Permission),
      ) ||
      !Array.isArray(claims.amr) ||
      !claims.amr.includes('pwd') ||
      !claims.amr.includes('otp')
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }
    return claims as AccessClaims;
  }

  async issueStepUpProof(input: {
    identityId: string;
    sessionId: string;
    action: string;
  }): Promise<string> {
    const id = randomUUID();
    const jti = randomUUID();
    const expiresAt = new Date(
      Date.now() + this.config.stepUpTtlSeconds * 1000,
    );
    const token = jwt.sign(
      { sid: input.sessionId, act: input.action, typ: 'stepup' },
      this.signingSecret,
      {
        algorithm: 'HS256',
        issuer: this.config.issuer,
        audience: this.config.audience,
        subject: input.identityId,
        jwtid: jti,
        expiresIn: this.config.stepUpTtlSeconds,
      },
    );

    await this.prisma.stepUpProof.create({
      data: {
        id,
        identityId: input.identityId,
        sessionId: input.sessionId,
        action: input.action,
        jti,
        expiresAt,
      },
    });
    return token;
  }

  verifyStepUpProof(token: string): StepUpClaims {
    const claims = this.verify(token);
    if (
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string' ||
      typeof claims.act !== 'string' ||
      typeof claims.jti !== 'string' ||
      claims.typ !== 'stepup'
    ) {
      throw new UnauthorizedException('Invalid step-up proof.');
    }
    return claims as StepUpClaims;
  }

  hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private verify(token: string): JwtPayload {
    const decoded = jwt.decode(token, { complete: true });
    if (
      !decoded ||
      typeof decoded === 'string' ||
      decoded.header.alg !== 'HS256'
    ) {
      throw new UnauthorizedException('Invalid token.');
    }

    for (const secret of this.verificationSecrets) {
      try {
        const claims = jwt.verify(token, secret, {
          algorithms: ['HS256'],
          issuer: this.config.issuer,
          audience: this.config.audience,
        });
        if (typeof claims !== 'string') {
          return claims;
        }
      } catch {
        continue;
      }
    }
    throw new UnauthorizedException('Invalid token.');
  }
}
