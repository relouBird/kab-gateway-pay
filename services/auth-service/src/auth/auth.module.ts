import { Module } from '@nestjs/common';
import { EmailOtpModule } from '../email-otp/email-otp.module';
import { EmailOtpService } from '../email-otp/email-otp.service';
import { InvitationEmailService } from '../email-otp/invitation-email.service';
import { PrismaService } from '../database/prisma.service';
import { RoleSeederService } from '../database/role-seeder.service';
import { ServiceClientSeederService } from '../database/service-client-seeder.service';
import {
  LoggingEventPublisher,
  OutboxLogPublisherService,
} from '../database/outbox-log-publisher.service';
import { EVENT_PUBLISHER } from '../database/event-publisher';
import { AuditService } from '../security/audit.service';
import { PasswordService } from '../security/password.service';
import { TokenService } from '../security/token.service';
import { AdminController, InternalController } from './admin.controller';
import { AuthController, JwksController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AccessReviewScheduler } from './access-review.scheduler';
import { AUTH_CONFIG, readAuthConfig } from '../config/auth.config';
import {
  AccessTokenGuard,
  PermissionGuard,
  StepUpGuard,
} from '../common/auth.guards';

@Module({
  imports: [EmailOtpModule],
  controllers: [
    AuthController,
    AdminController,
    InternalController,
    JwksController,
  ],
  providers: [
    PrismaService,
    RoleSeederService,
    ServiceClientSeederService,
    { provide: EVENT_PUBLISHER, useClass: LoggingEventPublisher },
    OutboxLogPublisherService,
    {
      provide: AccessReviewScheduler,
      inject: [PrismaService, AUTH_CONFIG],
      useFactory: (
        prisma: PrismaService,
        config: ReturnType<typeof readAuthConfig>,
      ) => new AccessReviewScheduler(prisma, config),
    },
    AuditService,
    {
      provide: AUTH_CONFIG,
      useFactory: () => readAuthConfig(process.env),
    },
    {
      provide: PasswordService,
      inject: [AUTH_CONFIG],
      useFactory: (config: ReturnType<typeof readAuthConfig>) =>
        new PasswordService(config.passwordMinLength),
    },
    {
      provide: TokenService,
      inject: [PrismaService, AUTH_CONFIG],
      useFactory: (
        prisma: PrismaService,
        config: ReturnType<typeof readAuthConfig>,
      ) => new TokenService(prisma, config),
    },
    {
      provide: OtpService,
      inject: [PrismaService, EmailOtpService, AUTH_CONFIG, AuditService],
      useFactory: (
        prisma: PrismaService,
        email: EmailOtpService,
        config: ReturnType<typeof readAuthConfig>,
        audit: AuditService,
      ) => new OtpService(prisma, email, config, audit),
    },
    {
      provide: AuthService,
      inject: [
        PrismaService,
        OtpService,
        PasswordService,
        TokenService,
        AuditService,
        InvitationEmailService,
        AUTH_CONFIG,
      ],
      useFactory: (
        prisma: PrismaService,
        otp: OtpService,
        passwords: PasswordService,
        tokens: TokenService,
        audit: AuditService,
        invitations: InvitationEmailService,
        config: ReturnType<typeof readAuthConfig>,
      ) =>
        new AuthService(
          prisma,
          otp,
          passwords,
          tokens,
          audit,
          invitations,
          config,
        ),
    },
    {
      provide: AccessTokenGuard,
      inject: [TokenService, PrismaService, AUTH_CONFIG],
      useFactory: (
        tokens: TokenService,
        prisma: PrismaService,
        config: ReturnType<typeof readAuthConfig>,
      ) => new AccessTokenGuard(tokens, prisma, config),
    },
    PermissionGuard,
    StepUpGuard,
  ],
  exports: [PrismaService, AUTH_CONFIG, AuthService],
})
export class AuthModule {}
