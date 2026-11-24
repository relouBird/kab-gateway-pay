import { readSmtpConfig } from './smtp.config';

describe('readSmtpConfig', () => {
  it('defaults to the local Maildev SMTP listener outside production', () => {
    expect(readSmtpConfig({})).toMatchObject({
      host: '127.0.0.1',
      port: 1025,
      secure: false,
      requireTLS: false,
      from: 'no-reply@kgpay.local',
    });
  });

  it('requires TLS and complete host configuration in production', () => {
    expect(() =>
      readSmtpConfig({
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_FROM: 'no-reply@example.com',
      }),
    ).toThrow('Production SMTP must use TLS');

    expect(
      readSmtpConfig({
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_FROM: 'no-reply@example.com',
        SMTP_REQUIRE_TLS: 'true',
      }),
    ).toMatchObject({
      host: 'smtp.example.com',
      port: 587,
      requireTLS: true,
    });
  });

  it('rejects invalid ports and partial credentials', () => {
    expect(() => readSmtpConfig({ SMTP_PORT: '0' })).toThrow('SMTP_PORT');
    expect(() => readSmtpConfig({ SMTP_USER: 'mailer' })).toThrow(
      'SMTP_USER and SMTP_PASSWORD',
    );
  });
});
