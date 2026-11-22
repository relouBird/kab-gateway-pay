import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_FROM_ADDRESS, EMAIL_TRANSPORT } from './email-otp.tokens';
import type {
  EmailTransport,
  OtpEmailPurpose,
  SendOtpEmailInput,
} from './email-otp.types';

const PURPOSE_LABELS: Record<OtpEmailPurpose, { en: string; fr: string }> = {
  contact_verification: {
    en: 'verify your email address',
    fr: 'vérifier votre adresse e-mail',
  },
  login: {
    en: 'sign in to your account',
    fr: 'vous connecter à votre compte',
  },
  password_recovery: {
    en: 'reset your password',
    fr: 'réinitialiser votre mot de passe',
  },
  step_up: {
    en: 'confirm a sensitive action',
    fr: 'confirmer une action sensible',
  },
};

@Injectable()
export class EmailOtpService {
  constructor(
    @Inject(EMAIL_TRANSPORT)
    private readonly transport: EmailTransport,
    @Inject(EMAIL_FROM_ADDRESS)
    private readonly from: string,
  ) {}

  async send(input: SendOtpEmailInput): Promise<void> {
    const purpose = PURPOSE_LABELS[input.purpose];
    const subject =
      input.locale === 'fr'
        ? 'Votre code de sécurité KG Pay'
        : 'Your KG Pay security code';
    const text =
      input.locale === 'fr'
        ? `Utilisez le code ${input.code} pour ${purpose.fr}. Il expire dans ${input.expiresInMinutes} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`
        : `Use code ${input.code} to ${purpose.en}. It expires in ${input.expiresInMinutes} minutes. If you did not request this, you can ignore this email.`;

    await this.transport.sendMail({
      from: this.from,
      to: input.to,
      subject,
      text,
    });
  }
}
