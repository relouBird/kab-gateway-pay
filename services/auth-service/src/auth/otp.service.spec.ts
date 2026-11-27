import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { jest as jestApi } from '@jest/globals';
import { OtpPurpose } from '@prisma/generated';
import { createHmac } from 'node:crypto';
import { AuditService } from '../security/audit.service';
import { EmailOtpService } from '../email-otp/email-otp.service';
import { PrismaService } from '../database/prisma.service';
import { validAuthConfig } from '../../test/helpers/auth-config';
import { OtpService } from './otp.service';

const createMock = () => jestApi.fn<(...args: unknown[]) => Promise<unknown>>();

describe('OtpService', () => {
  const config = validAuthConfig();
  let service: OtpService;
  let prisma: {
    $transaction: jest.Mock;
    otpChallenge: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let transaction: {
    $queryRaw: jest.Mock;
    otpChallenge: {
      findFirst: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    outboxEvent: { create: jest.Mock };
    accessEvent: { create: jest.Mock };
  };
  let email: { send: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(() => {
    transaction = {
      $queryRaw: jestApi.fn(),
      otpChallenge: {
        findFirst: createMock().mockResolvedValue(null),
        count: createMock().mockResolvedValue(0),
        updateMany: createMock().mockResolvedValue({ count: 0 }),
        create: createMock().mockResolvedValue({}),
      },
      outboxEvent: { create: createMock().mockResolvedValue({}) },
      accessEvent: { create: createMock().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jestApi.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
      otpChallenge: {
        findUnique: jestApi.fn(),
        updateMany: createMock().mockResolvedValue({ count: 1 }),
      },
    };
    email = { send: createMock().mockResolvedValue(undefined) };
    audit = { record: createMock().mockResolvedValue(undefined) };
    service = new OtpService(
      prisma as unknown as PrismaService,
      email as unknown as EmailOtpService,
      config,
      audit as unknown as AuditService,
    );
  });

  it('stores only an HMAC hash and sends the generated code to the challenge email', async () => {
    const result = await service.issue(
      { id: 'identity-id', email: 'new-address@example.com' },
      OtpPurpose.STEP_UP,
      'iam.identity.email-change',
      'fr',
    );
    const stored = transaction.otpChallenge.create.mock.calls[0][0].data;
    const delivered = email.send.mock.calls[0][0];
    const expectedHash = createHmac('sha256', config.otpHashKey)
      .update(stored.codeSalt)
      .update(':')
      .update(delivered.code)
      .digest('hex');

    expect(result.challengeId).toBe(stored.id);
    expect(stored.targetEmail).toBe('new-address@example.com');
    expect(stored.codeHash).toBe(expectedHash);
    expect(stored.codeHash).not.toBe(delivered.code);
    expect(delivered).toMatchObject({
      to: 'new-address@example.com',
      purpose: 'step_up',
      locale: 'fr',
    });
    expect(
      JSON.stringify(transaction.outboxEvent.create.mock.calls),
    ).not.toContain(delivered.code);
  });

  it('consumes a valid code once and rejects a replay', async () => {
    const code = '004321';
    const salt = 'random-salt';
    prisma.otpChallenge.findUnique.mockResolvedValue({
      id: 'challenge-id',
      identityId: 'identity-id',
      purpose: OtpPurpose.LOGIN,
      action: null,
      credentialVersion: 'version',
      codeSalt: salt,
      codeHash: createHmac('sha256', config.otpHashKey)
        .update(salt)
        .update(':')
        .update(code)
        .digest('hex'),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });

    await expect(
      service.consume('challenge-id', code, OtpPurpose.LOGIN),
    ).resolves.toMatchObject({
      identityId: 'identity-id',
      purpose: OtpPurpose.LOGIN,
      credentialVersion: 'version',
    });
    prisma.otpChallenge.findUnique.mockResolvedValue({
      id: 'challenge-id',
      identityId: 'identity-id',
      purpose: OtpPurpose.LOGIN,
      action: null,
      credentialVersion: 'version',
      codeSalt: salt,
      codeHash: createHmac('sha256', config.otpHashKey)
        .update(salt)
        .update(':')
        .update(code)
        .digest('hex'),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(),
    });

    await expect(
      service.consume('challenge-id', code, OtpPurpose.LOGIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('invalidates a persisted challenge and surfaces SMTP delivery failure', async () => {
    email.send.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      service.issue(
        { id: 'identity-id', email: 'customer@example.com' },
        OtpPurpose.LOGIN,
        null,
        'en',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.otpChallenge.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: transaction.otpChallenge.create.mock.calls[0][0].data.id,
        }),
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'OTP_DELIVERY_FAILED' }),
    );
  });
});
