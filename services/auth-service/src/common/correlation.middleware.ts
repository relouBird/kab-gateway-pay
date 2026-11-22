import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface CorrelatedRequest extends Request {
  correlationId: string;
}

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function correlationMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const suppliedId = request.header('x-correlation-id');
  const correlationId =
    suppliedId && CORRELATION_ID_PATTERN.test(suppliedId)
      ? suppliedId
      : randomUUID();

  (request as CorrelatedRequest).correlationId = correlationId;
  response.setHeader('x-correlation-id', correlationId);
  next();
}
