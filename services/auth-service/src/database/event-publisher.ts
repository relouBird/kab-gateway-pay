import type { Prisma } from '@prisma/generated';

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface EventPublisher {
  publish(event: {
    outboxId: string;
    eventName: string;
    schemaVersion: number;
    occurredAt: Date;
    payload: Prisma.JsonValue;
  }): Promise<void>;
}
