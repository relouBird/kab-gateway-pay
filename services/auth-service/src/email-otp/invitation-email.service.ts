import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_FROM_ADDRESS, EMAIL_TRANSPORT } from './email-otp.tokens';
import { createInvitationEmailTemplate } from './email-templates';
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
    staffPortalUrl?: string,
  ): Promise<void> {
    const invitationUrl = staffPortalUrl
      ? new URL(
          'accept-invitation',
          `${staffPortalUrl.replace(/\/+$/, '')}/`,
        ).toString()
      : undefined;
    const template = createInvitationEmailTemplate({
      token,
      expiresInHours,
      locale,
      invitationUrl,
    });
    await this.transport.sendMail({
      from: this.from,
      to,
      ...template,
    });
  }
}
