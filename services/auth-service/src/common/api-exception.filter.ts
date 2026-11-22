import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { CorrelatedRequest } from './correlation.middleware';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<CorrelatedRequest>();
    const response = context.getResponse<Response>();
    if (response.headersSent) {
      return;
    }

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof body === 'string'
        ? body
        : body &&
            typeof body === 'object' &&
            'message' in body &&
            (typeof body.message === 'string' || Array.isArray(body.message))
          ? body.message
          : 'Internal server error.';

    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          correlationId: request.correlationId,
          errorType:
            exception instanceof Error ? exception.name : 'UnknownError',
        }),
      );
    }
    response.status(statusCode).json({
      statusCode,
      message,
      correlationId: request.correlationId,
    });
  }
}
