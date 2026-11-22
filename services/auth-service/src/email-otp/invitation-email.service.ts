import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_FROM_ADDRESS, EMAIL_TRANSPORT } from './email-otp.tokens';
import type { EmailTransport } from './email-otp.types';

@Injectable()
export class InvitationEmailService {
  constructor(
    @Inject(EMAIL_TRANSPORT)
    private readonly transport: EmailTransport,
    @Inject(EMAIL_FROM_ADDRESS)
    private readonly from: string,
  ) {}

  async send(
    to: string,
    token: string,
    expiresInHours: number,
    locale: 'en' | 'fr',
  ): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to,
      subject:
        locale === 'fr'
          ? 'Votre invitation KG Pay'
          : 'Your KG Pay staff invitation',
      text:
        locale === 'fr'
          ? `Utilisez ce jeton d'invitation à usage unique avec POST /auth/invitations/accept : ${token}. Il expire dans ${expiresInHours} heures. Si vous n'attendiez pas cette invitation, ignorez cet e-mail.`
          : `Use this one-time invitation token with POST /auth/invitations/accept: ${token}. It expires in ${expiresInHours} hours. If you did not expect this invitation, ignore this email.`,
    });
  }
}
