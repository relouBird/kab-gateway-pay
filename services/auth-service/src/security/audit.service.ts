import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/generated';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';

export interface AuditInput {
  identityId?: string | null;
  eventType: string;
  result: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId: string;
  metadata?: Prisma.InputJsonObject;
}

export async function appendAuditEvent(
  transaction: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  const id = randomUUID();
  const occurredAt = new Date();
  const payload = {
    eventId: id,
    identityId: input.identityId ?? null,
    eventType: input.eventType,
    result: input.result,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    correlationId: input.correlationId,
    occurredAt: occurredAt.toISOString(),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
  await transaction.accessEvent.create({
    data: {
      id,
      identityId: input.identityId ?? null,
      eventType: input.eventType,
      result: input.result,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      correlationId: input.correlationId,
      occurredAt,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
  await transaction.outboxEvent.create({
    data: {
      id: randomUUID(),
      eventName: 'AccessAuditEvent',
      payload,
      occurredAt,
    },
  });
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: AuditInput): Promise<void> {
    return this.prisma.$transaction((transaction) =>
      appendAuditEvent(transaction, input),
    );
  }
}
