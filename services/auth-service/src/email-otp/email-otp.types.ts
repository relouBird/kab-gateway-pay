export type OtpEmailPurpose =
  'contact_verification' | 'login' | 'password_recovery' | 'step_up';

export type OtpEmailLocale = 'en' | 'fr';

export interface SendOtpEmailInput {
  to: string;
  code: string;
  purpose: OtpEmailPurpose;
  locale: OtpEmailLocale;
  expiresInMinutes: number;
}

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailTransport {
  sendMail(message: EmailMessage): Promise<unknown>;
}
