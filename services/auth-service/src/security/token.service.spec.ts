import { UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../database/prisma.service';
import { validAuthConfig } from '../../test/helpers/auth-config';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const environmentKeys = [
    'JWT_SIGNING_SECRET',
    'JWT_SIGNING_PREVIOUS_SECRETS_JSON',
  ] as const;
  const previousEnvironment = new Map(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  let tokens: TokenService;
  let signingSecret: string;

  beforeEach(() => {
    signingSecret = randomBytes(64).toString('base64url');
    process.env.JWT_SIGNING_SECRET = signingSecret;
    delete process.env.JWT_SIGNING_PREVIOUS_SECRETS_JSON;
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

  it('issues an HS256 access token with the current permission catalogue', () => {
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
    expect(jwt.decode(token, { complete: true })?.header).toEqual({
      alg: 'HS256',
      typ: 'JWT',
    });
  });

  it('accepts an empty optional previous-secret configuration', () => {
    process.env.JWT_SIGNING_PREVIOUS_SECRETS_JSON = '  ';
    tokens = new TokenService(new PrismaService(), validAuthConfig());

    const token = tokens.issueAccessToken({
      identityId: 'identity-id',
      sessionId: 'session-id',
      subjectType: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: [],
    });
    expect(tokens.verifyAccessToken(token).sub).toBe('identity-id');
  });

  it('rejects malformed previous-secret configuration', () => {
    process.env.JWT_SIGNING_PREVIOUS_SECRETS_JSON = '{';

    expect(
      () => new TokenService(new PrismaService(), validAuthConfig()),
    ).toThrow('JWT_SIGNING_PREVIOUS_SECRETS_JSON must be a JSON array.');
  });

  it('verifies tokens signed by a previous secret during rotation overlap', () => {
    const previousSecret = randomBytes(64).toString('base64url');
    process.env.JWT_SIGNING_PREVIOUS_SECRETS_JSON = JSON.stringify([
      previousSecret,
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
      previousSecret,
      {
        algorithm: 'HS256',
        issuer: 'https://auth.example.test',
        audience: 'kgpay-services',
        subject: 'identity-id',
        expiresIn: '5m',
      },
    );

    expect(tokens.verifyAccessToken(token).typ).toBe('STAFF');
  });

  it('requires a long base64url current secret and rejects duplicate previous secrets', () => {
    process.env.JWT_SIGNING_SECRET = 'short';
    expect(
      () => new TokenService(new PrismaService(), validAuthConfig()),
    ).toThrow(
      'JWT_SIGNING_SECRET must be a base64url secret of at least 64 characters.',
    );

    process.env.JWT_SIGNING_SECRET = signingSecret;
    process.env.JWT_SIGNING_PREVIOUS_SECRETS_JSON = JSON.stringify([
      signingSecret,
    ]);
    expect(
      () => new TokenService(new PrismaService(), validAuthConfig()),
    ).toThrow(
      'Each previous JWT signing secret must be a distinct base64url secret of at least 64 characters.',
    );

    const previousSecret = randomBytes(64).toString('base64url');
    process.env.JWT_SIGNING_PREVIOUS_SECRETS_JSON = JSON.stringify([
      previousSecret,
      previousSecret,
    ]);
    expect(
      () => new TokenService(new PrismaService(), validAuthConfig()),
    ).toThrow('JWT signing secrets must be unique.');
  });

  it('rejects tokens signed with a different algorithm', () => {
    const token = jwt.sign(
      {
        sid: 'session-id',
        typ: 'STAFF',
        roles: ['GLOBAL_SUPER_ADMIN'],
        permissions: [],
        pv: 1,
        amr: ['pwd', 'otp'],
      },
      signingSecret,
      {
        algorithm: 'HS384',
        issuer: 'https://auth.example.test',
        audience: 'kgpay-services',
        subject: 'identity-id',
        expiresIn: '5m',
      },
    );

    expect(() => tokens.verifyAccessToken(token)).toThrow(
      UnauthorizedException,
    );
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
      signingSecret,
      {
        algorithm: 'HS256',
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
