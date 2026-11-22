import type { Request } from 'express';
import type { CorrelatedRequest } from './correlation.middleware';

export interface RequestMetadata {
  correlationId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export function getRequestMetadata(request: Request): RequestMetadata {
  const correlated = request as CorrelatedRequest;
  return {
    correlationId: correlated.correlationId,
    ipAddress: request.ip || null,
    userAgent: request.header('user-agent')?.slice(0, 512) ?? null,
  };
}
