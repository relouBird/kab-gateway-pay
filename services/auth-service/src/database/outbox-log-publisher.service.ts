import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EVENT_PUBLISHER, type EventPublisher } from './event-publisher';

@Injectable()
export class LoggingEventPublisher implements EventPublisher {
  private readonly logger = new Logger(LoggingEventPublisher.name);

  async publish(
    event: Parameters<EventPublisher['publish']>[0],
  ): Promise<void> {
    this.logger.log(
      JSON.stringify({
        outboxId: event.outboxId,
        eventName: event.eventName,
      }),
    );
  }
}

@Injectable()
export class OutboxLogPublisherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OutboxLogPublisherService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.publishPendingEventHeaders();
    this.timer = setInterval(() => {
      void this.publishPendingEventHeaders().catch(() => {
        this.logger.error('Outbox logging failed; events remain persisted.');
      });
    }, 5_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async publishPendingEventHeaders(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { loggedAt: null },
        orderBy: { occurredAt: 'asc' },
        take: 100,
        select: {
          id: true,
          eventName: true,
          schemaVersion: true,
          occurredAt: true,
          payload: true,
        },
      });
      for (const event of events) {
        await this.publisher.publish({
          outboxId: event.id,
          eventName: event.eventName,
          schemaVersion: event.schemaVersion,
          occurredAt: event.occurredAt,
          payload: event.payload,
        });
        await this.prisma.outboxEvent.updateMany({
          where: { id: event.id, loggedAt: null },
          data: { loggedAt: new Date() },
        });
      }
    } finally {
      this.running = false;
    }
  }
}
