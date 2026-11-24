import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { IdentityStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { appendAuditEvent } from '../security/audit.service';
import { AUTH_CONFIG, type AuthConfig } from '../config/auth.config';

@Injectable()
export class AccessReviewScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccessReviewScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTH_CONFIG)
    private readonly config: AuthConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.runReview();
    this.timer = setInterval(
      () => {
        void this.runReview().catch(() => {
          this.logger.error(
            'Scheduled access review failed; it will retry at the next interval.',
          );
        });
      },
      24 * 60 * 60 * 1000,
    );
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async runReview(): Promise<void> {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - this.config.staffInactivityDays * 86400_000,
    );
    const inactiveStaff = await this.prisma.identity.findMany({
      where: {
        subjectType: 'STAFF',
        status: IdentityStatus.ACTIVE,
        OR: [
          { lastLoginAt: { lt: cutoff } },
          { lastLoginAt: null, createdAt: { lt: cutoff } },
        ],
      },
      select: {
        id: true,
      },
    });

    for (const identity of inactiveStaff) {
      await this.prisma.$transaction(
        async (transaction) => {
          await transaction.$queryRaw`
            SELECT pg_advisory_xact_lock(hashtext('kgpay-global-admin-invariant'))::text
          `;
          await transaction.$queryRaw`
            SELECT pg_advisory_xact_lock(hashtext(${identity.id}))::text
          `;
          const current = await transaction.identity.findUnique({
            where: { id: identity.id },
            include: {
              roles: { include: { role: { select: { code: true } } } },
            },
          });
          if (!current || current.status !== IdentityStatus.ACTIVE) {
            return;
          }
          if (
            current.roles.some(({ role }) => role.code === 'GLOBAL_SUPER_ADMIN')
          ) {
            const activeAdmins = await transaction.identityRole.count({
              where: {
                role: { code: 'GLOBAL_SUPER_ADMIN' },
                identity: { status: IdentityStatus.ACTIVE },
              },
            });
            if (activeAdmins <= 1) {
              return;
            }
          }
          const changed = await transaction.identity.updateMany({
            where: { id: identity.id, status: IdentityStatus.ACTIVE },
            data: { status: IdentityStatus.DISABLED },
          });
          if (!changed.count) {
            return;
          }
          await transaction.sessionFamily.updateMany({
            where: { identityId: identity.id, revokedAt: null },
            data: {
              revokedAt: now,
              revocationReason: 'STAFF_INACTIVE',
            },
          });
          await appendAuditEvent(transaction, {
            identityId: identity.id,
            eventType: 'STAFF_DISABLED_FOR_INACTIVITY',
            result: 'SUCCESS',
            correlationId: randomUUID(),
          });
          await transaction.outboxEvent.create({
            data: {
              id: randomUUID(),
              eventName: 'IdentityDisabled',
              payload: {
                eventId: randomUUID(),
                identityId: identity.id,
                reason: 'STAFF_INACTIVE',
                occurredAt: now.toISOString(),
              },
              occurredAt: now,
            },
          });
          await transaction.outboxEvent.create({
            data: {
              id: randomUUID(),
              eventName: 'SessionRevoked',
              payload: {
                eventId: randomUUID(),
                identityId: identity.id,
                reason: 'STAFF_INACTIVE',
                occurredAt: now.toISOString(),
              },
              occurredAt: now,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }
  }
}
