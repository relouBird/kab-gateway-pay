import { Module } from '@nestjs/common';
import { EmailOtpModule } from './email-otp/email-otp.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [EmailOtpModule],
  controllers: [HealthController],
})
export class AppModule {}
