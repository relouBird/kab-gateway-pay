import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

interface AdditionalPublicKey {
  kid: string;
  publicKeyPem: string;
}

@Injectable()
export class TokenService {
  private readonly signingKey;
  private readonly keyId: string;
  private readonly publicKeys = new Map<
    string,
    ReturnType<typeof createPublicKey>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AuthConfig,
  ) {
    const privatePem = (
      process.env.JWT_PRIVATE_KEY ??
      (process.env.JWT_PRIVATE_KEY_FILE
        ? readFileSync(resolve(process.env.JWT_PRIVATE_KEY_FILE), 'utf8')
        : undefined)
    )?.replace(/\\n/g, '\n');
    const keyId = process.env.JWT_KEY_ID?.trim();
    if (!privatePem || !keyId || !/^[A-Za-z0-9._-]{1,64}$/.test(keyId)) {
      throw new Error(
        'JWT_PRIVATE_KEY and JWT_KEY_ID are required at runtime.',
      );
    }

    this.signingKey = createPrivateKey(privatePem);
    if (
      this.signingKey.asymmetricKeyType !== 'rsa' ||
      (this.signingKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    ) {
      throw new Error(
        'JWT_PRIVATE_KEY must be an RSA key of at least 2048 bits.',
      );
    }
    this.keyId = keyId;
    this.publicKeys.set(keyId, createPublicKey(this.signingKey));

    const rawAdditionalKeys = process.env.AUTH_SIGNING_PUBLIC_KEYS_JSON?.trim();
    let additionalKeys: AdditionalPublicKey[];
    try {
      additionalKeys = rawAdditionalKeys
        ? (JSON.parse(rawAdditionalKeys) as AdditionalPublicKey[])
        : [];
    } catch {
      throw new Error('AUTH_SIGNING_PUBLIC_KEYS_JSON must be a JSON array.');
    }
    if (!Array.isArray(additionalKeys)) {
      throw new Error('AUTH_SIGNING_PUBLIC_KEYS_JSON must be a JSON array.');
    }

    for (const key of additionalKeys) {
      if (
        !key ||
        typeof key.kid !== 'string' ||
        typeof key.publicKeyPem !== 'string' ||
        !/^[A-Za-z0-9._-]{1,64}$/.test(key.kid) ||
        !key.publicKeyPem ||
        /PRIVATE KEY/i.test(key.publicKeyPem)
      ) {
        throw new Error(
          'Each signing public key requires a kid and publicKeyPem.',
        );
      }
      if (this.publicKeys.has(key.kid)) {
        throw new Error(`Duplicate JWT key id: ${key.kid}.`);
      }
      const publicKey = createPublicKey(key.publicKeyPem.replace(/\\n/g, '\n'));
      if (
        publicKey.asymmetricKeyType !== 'rsa' ||
        (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
      ) {
        throw new Error(
          'Each signing public key must be RSA with at least 2048 bits.',
        );
      }
      this.publicKeys.set(key.kid, publicKey);
    }
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
      this.signingKey,
      {
        algorithm: 'RS256',
        keyid: this.keyId,
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
      this.signingKey,
      {
        algorithm: 'RS256',
        keyid: this.keyId,
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

  getJwks(): { keys: Record<string, string>[] } {
    const keys = [...this.publicKeys.entries()].map(([kid, key]) => {
      const jwk = key.export({ format: 'jwk' });
      if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
        throw new InternalServerErrorException(
          'The configured signing key cannot be published as an RSA JWK.',
        );
      }
      return {
        kty: jwk.kty,
        use: 'sig',
        alg: 'RS256',
        kid,
        n: jwk.n,
        e: jwk.e,
      };
    });
    return { keys };
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
      typeof decoded.header.kid !== 'string' ||
      decoded.header.alg !== 'RS256'
    ) {
      throw new UnauthorizedException('Invalid token.');
    }

    const key = this.publicKeys.get(decoded.header.kid);
    if (!key) {
      throw new UnauthorizedException('Invalid token.');
    }
    try {
      const claims = jwt.verify(token, key, {
        algorithms: ['RS256'],
        issuer: this.config.issuer,
        audience: this.config.audience,
      });
      if (typeof claims === 'string') {
        throw new UnauthorizedException('Invalid token.');
      }
      return claims;
    } catch {
      throw new UnauthorizedException('Invalid token.');
    }
  }
}
