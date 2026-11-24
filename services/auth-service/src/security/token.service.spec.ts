import { UnauthorizedException } from '@nestjs/common';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../database/prisma.service';
import { validAuthConfig } from '../../test/helpers/auth-config';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const environmentKeys = [
    'JWT_PRIVATE_KEY',
    'JWT_KEY_ID',
    'AUTH_SIGNING_PUBLIC_KEYS_JSON',
  ] as const;
  const previousEnvironment = new Map(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  let tokens: TokenService;
  let privateKey: string;

  beforeEach(() => {
    const currentKeyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    privateKey = currentKeyPair.privateKey;
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_KEY_ID = 'current-key';
    delete process.env.AUTH_SIGNING_PUBLIC_KEYS_JSON;
    tokens = new TokenService(new PrismaService(), validAuthConfig());
  });

  afterEach(() => {
    for (const key of environmentKeys) {
      const previous = previousEnvironment.get(key);
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  });

  it('issues an RS256 access token with the current permission catalogue', () => {
    const token = tokens.issueAccessToken({
      identityId: 'identity-id',
      sessionId: 'session-id',
      subjectType: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: [],
    });

    expect(tokens.verifyAccessToken(token)).toMatchObject({
      sub: 'identity-id',
      sid: 'session-id',
      typ: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: [],
      pv: 1,
      amr: ['pwd', 'otp'],
    });
    expect(tokens.getJwks().keys).toMatchObject([
      { kid: 'current-key', alg: 'RS256', use: 'sig' },
    ]);
  });

  it('accepts an empty optional previous-key configuration', () => {
    process.env.AUTH_SIGNING_PUBLIC_KEYS_JSON = '  ';
    tokens = new TokenService(new PrismaService(), validAuthConfig());

    expect(tokens.getJwks().keys.map(({ kid }) => kid)).toEqual([
      'current-key',
    ]);
  });

  it('rejects malformed non-empty previous-key configuration', () => {
    process.env.AUTH_SIGNING_PUBLIC_KEYS_JSON = '{';

    expect(
      () => new TokenService(new PrismaService(), validAuthConfig()),
    ).toThrow('AUTH_SIGNING_PUBLIC_KEYS_JSON must be a JSON array.');
  });

  it('verifies tokens signed by a previous public key during rotation overlap', () => {
    const previousKeyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    process.env.AUTH_SIGNING_PUBLIC_KEYS_JSON = JSON.stringify([
      { kid: 'previous-key', publicKeyPem: previousKeyPair.publicKey },
    ]);
    tokens = new TokenService(new PrismaService(), validAuthConfig());
    const token = jwt.sign(
      {
        sid: 'session-id',
        typ: 'STAFF',
        roles: ['GLOBAL_SUPER_ADMIN'],
        permissions: [],
        pv: 1,
        amr: ['pwd', 'otp'],
      },
      previousKeyPair.privateKey,
      {
        algorithm: 'RS256',
        keyid: 'previous-key',
        issuer: 'https://auth.example.test',
        audience: 'kgpay-services',
        subject: 'identity-id',
        expiresIn: '5m',
      },
    );

    expect(tokens.verifyAccessToken(token).typ).toBe('STAFF');
    expect(tokens.getJwks().keys.map(({ kid }) => kid)).toEqual([
      'current-key',
      'previous-key',
    ]);
  });

  it('rejects a correctly signed token containing a permission outside the catalogue', () => {
    const invalidToken = jwt.sign(
      {
        sid: 'session-id',
        typ: 'STAFF',
        roles: ['GLOBAL_SUPER_ADMIN'],
        permissions: ['iam.permission.unknown'],
        pv: 1,
        amr: ['pwd', 'otp'],
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'current-key',
        issuer: 'https://auth.example.test',
        audience: 'kgpay-services',
        subject: 'identity-id',
        expiresIn: '5m',
      },
    );

    expect(() => tokens.verifyAccessToken(invalidToken)).toThrow(
      UnauthorizedException,
    );
  });
});
