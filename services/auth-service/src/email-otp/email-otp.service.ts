import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_FROM_ADDRESS, EMAIL_TRANSPORT } from './email-otp.tokens';
import { createOtpEmailTemplate } from './email-templates';
import type { EmailTransport, SendOtpEmailInput } from './email-otp.types';

@Injectable()
export class EmailOtpService {
  constructor(
    @Inject(EMAIL_TRANSPORT)
    private readonly transport: EmailTransport,
    @Inject(EMAIL_FROM_ADDRESS)
    private readonly from: string,
  ) {}

  async send(input: SendOtpEmailInput): Promise<void> {
    const template = createOtpEmailTemplate(input);
    await this.transport.sendMail({
      from: `"KG Pay, Support" <${this.from}>`,
      to: input.to,
      ...template,
    });
  }
}
