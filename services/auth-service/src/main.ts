import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AuthModule } from './auth/auth.module';
import { correlationMiddleware } from './common/correlation.middleware';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { AUTH_CONFIG } from './config/auth.config';
import { loadRuntimeEnvironment } from './config/runtime-env';
import type { AuthConfig } from './config/auth.config';
import { AppModule } from './app.module';
import { normalizeOpenApiSecurity } from './common/openapi-security';

async function bootstrap() {
  loadRuntimeEnvironment();
  const app = await NestFactory.create(AppModule);
  const config = app.select(AuthModule).get<AuthConfig>(AUTH_CONFIG);
  app.use(cookieParser());
  app.use(correlationMiddleware);
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.enableCors({
    origin: config.corsOrigins.length ? config.corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Correlation-Id',
      'X-CSRF-Token',
      'X-Step-Up-Proof',
      'X-Service-Client',
      'X-Service-Secret',
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('KG Pay Identity and Access API')
    .setDescription(
      'CDC-01 identity, authentication, sessions, MFA, roles and administration.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'cookie', name: 'kgpay_refresh' },
      'kgpay_refresh',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
      'csrf_token',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-Step-Up-Proof' },
      'step_up_proof',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-Service-Client' },
      'service_client',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-Service-Secret' },
      'service_secret',
    )
    .build();
  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    normalizeOpenApiSecurity(document.paths);
    SwaggerModule.setup('docs', app, document);
  }
  app.enableShutdownHooks();
  const port = Number(process.env.PORT);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  await app.listen(port);
}
void bootstrap();
