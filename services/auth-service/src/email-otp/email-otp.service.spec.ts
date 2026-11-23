import { EmailOtpService } from './email-otp.service';
import type { EmailMessage, EmailTransport } from './email-otp.types';

describe('EmailOtpService', () => {
  let transport: EmailTransport;
  let service: EmailOtpService;
  let sentMessages: EmailMessage[];
  let sendFailure: Error | undefined;

  beforeEach(() => {
    sentMessages = [];
    sendFailure = undefined;
    transport = {
      sendMail: async (message) => {
        if (sendFailure) {
          throw sendFailure;
        }
        sentMessages.push(message);
      },
    };
    service = new EmailOtpService(transport, 'no-reply@kgpay.local');
  });

  it('sends a French login code without changing its purpose or recipient', async () => {
    await service.send({
      to: 'customer@example.com',
      code: '482731',
      purpose: 'login',
      locale: 'fr',
      expiresInMinutes: 5,
    });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages.at(0)).toMatchObject({
      from: 'no-reply@kgpay.local',
      to: 'customer@example.com',
      subject: 'Votre code de sécurité KG Pay',
      text: expect.stringContaining('pour vous connecter à votre compte'),
      html: expect.stringContaining('KG Pay'),
    });
    expect(sentMessages.at(0)?.text).toContain('482731');
    expect(sentMessages.at(0)?.html).toContain('482731');
  });

  it('sends an English password recovery code', async () => {
    await service.send({
      to: 'staff@example.com',
      code: '135790',
      purpose: 'password_recovery',
      locale: 'en',
      expiresInMinutes: 5,
    });

    expect(sentMessages.at(0)).toMatchObject({
      to: 'staff@example.com',
      subject: 'Your KG Pay security code',
      text: expect.stringContaining('reset your password'),
      html: expect.stringContaining('reset your password'),
    });
  });

  it('propagates SMTP failures to the caller', async () => {
    sendFailure = new Error('SMTP unavailable');

    await expect(
      service.send({
        to: 'staff@example.com',
        code: '135790',
        purpose: 'login',
        locale: 'en',
        expiresInMinutes: 5,
      }),
    ).rejects.toThrow('SMTP unavailable');
  });
});
