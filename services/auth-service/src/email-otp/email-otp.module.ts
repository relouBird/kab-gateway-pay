import { Module, type OnApplicationShutdown } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { EMAIL_FROM_ADDRESS, EMAIL_TRANSPORT } from './email-otp.tokens';
import { EmailOtpService } from './email-otp.service';
import { InvitationEmailService } from './invitation-email.service';
import { readSmtpConfig } from './smtp.config';

class SmtpTransportLifecycle implements OnApplicationShutdown {
  constructor(private readonly transport: Transporter) {}

  onApplicationShutdown(): void {
    this.transport.close();
  }
}

@Module({
  providers: [
    {
      provide: 'SMTP_CONFIG',
      useFactory: () => readSmtpConfig(process.env),
    },
    {
      provide: EMAIL_TRANSPORT,
      inject: ['SMTP_CONFIG'],
      useFactory: (config: ReturnType<typeof readSmtpConfig>) =>
        nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          requireTLS: config.requireTLS,
          ...(config.user && config.password
            ? { auth: { user: config.user, pass: config.password } }
            : {}),
        }),
    },
    {
      provide: EMAIL_FROM_ADDRESS,
      inject: ['SMTP_CONFIG'],
      useFactory: (config: ReturnType<typeof readSmtpConfig>) => config.from,
    },
    {
      provide: SmtpTransportLifecycle,
      inject: [EMAIL_TRANSPORT],
      useFactory: (transport: Transporter) =>
        new SmtpTransportLifecycle(transport),
    },
    EmailOtpService,
    InvitationEmailService,
  ],
  exports: [EmailOtpService, InvitationEmailService],
})
export class EmailOtpModule {}
