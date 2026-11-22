import { UnauthorizedException } from '@nestjs/common';
import { jest as jestApi } from '@jest/globals';
import { IdentityStatus, OtpPurpose } from '@prisma/client';
import { AuditService } from '../security/audit.service';
import { InvitationEmailService } from '../email-otp/invitation-email.service';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../security/password.service';
import { TokenService } from '../security/token.service';
import { validAuthConfig } from '../../test/helpers/auth-config';
import { OtpService } from './otp.service';
import { AuthService } from './auth.service';

const createMock = () => jestApi.fn<(...args: unknown[]) => Promise<unknown>>();

describe('AuthService.login', () => {
  const identity = {
    id: 'identity-id',
    subjectType: 'CUSTOMER',
    email: 'customer@example.com',
    emailNormalized: 'customer@example.com',
    emailVerifiedAt: new Date(),
    passwordHash: 'stored-hash',
    passwordChangedAt: new Date('2026-01-01T00:00:00.000Z'),
    status: IdentityStatus.ACTIVE,
    lockedUntil: null,
  };
  const metadata = {
    correlationId: 'request-123',
    ipAddress: '127.0.0.1',
    userAgent: 'test-client',
  };
  let service: AuthService;
  let prisma: {
    $transaction: jest.Mock;
    identity: { findUnique: jest.Mock };
  };
  let transaction: {
    $queryRaw: jest.Mock;
    identity: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    ipLoginAttempt: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    accessEvent: { create: jest.Mock };
    outboxEvent: { create: jest.Mock };
  };
  let passwords: { verify: jest.Mock };
  let otp: { issue: jest.Mock };

  beforeEach(() => {
    transaction = {
      $queryRaw: jestApi.fn(),
      identity: {
        findUnique: jestApi.fn(),
        findUniqueOrThrow: createMock().mockResolvedValue(identity),
        update: createMock().mockResolvedValue(identity),
      },
      ipLoginAttempt: {
        findUnique: createMock().mockResolvedValue(null),
        upsert: createMock().mockResolvedValue({}),
      },
      accessEvent: { create: createMock().mockResolvedValue({}) },
      outboxEvent: { create: createMock().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jestApi.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
      identity: { findUnique: createMock().mockResolvedValue(identity) },
    };
    passwords = { verify: createMock().mockResolvedValue(true) };
    otp = {
      issue: createMock().mockResolvedValue({
        challengeId: 'challenge-id',
        expiresAt: new Date(Date.now() + 300_000),
      }),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      otp as unknown as OtpService,
      passwords as unknown as PasswordService,
      {} as TokenService,
      {} as AuditService,
      {} as InvitationEmailService,
      validAuthConfig(),
    );
  });

  it('sends an email OTP after a valid password without creating a session', async () => {
    await expect(
      service.login(
        { email: 'customer@example.com', password: 'a-valid-password' },
        'fr',
        metadata,
      ),
    ).resolves.toMatchObject({ challengeId: 'challenge-id' });

    expect(otp.issue).toHaveBeenCalledWith(
      { id: identity.id, email: identity.email },
      OtpPurpose.LOGIN,
      null,
      'fr',
      metadata,
      `${identity.passwordChangedAt.toISOString()}:${identity.emailNormalized}`,
    );
    expect(transaction.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: 0, lockedUntil: null },
      }),
    );
  });

  it('does not request an OTP when the password is rejected', async () => {
    passwords.verify.mockResolvedValue(false);
    transaction.identity.findUnique.mockResolvedValue({
      failedLoginCount: 0,
      lockoutCount: 0,
      lockedUntil: null,
    });

    await expect(
      service.login(
        { email: 'customer@example.com', password: 'wrong-password' },
        'en',
        metadata,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(otp.issue).not.toHaveBeenCalled();
  });
});
