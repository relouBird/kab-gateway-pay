import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/generated';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize Prisma.');
    }

    const databaseUrl = new URL(connectionString);
    const connectionLimit = databaseUrl.searchParams.get('connection_limit');
    const schema = databaseUrl.searchParams.get('schema') ?? 'public';
    const maxConnections =
      connectionLimit === null ? undefined : Number(connectionLimit);
    if (
      maxConnections !== undefined &&
      (!Number.isSafeInteger(maxConnections) || maxConnections < 1)
    ) {
      throw new Error(
        'DATABASE_URL connection_limit must be a positive integer.',
      );
    }

    const adapter = new PrismaPg(
      {
        connectionString,
        ...(maxConnections === undefined ? {} : { max: maxConnections }),
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 300_000,
      },
      { schema },
    );
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
