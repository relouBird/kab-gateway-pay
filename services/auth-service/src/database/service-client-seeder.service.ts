import { Injectable, type OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.service';

interface ServiceClientConfiguration {
  clientId: string;
  secret: string;
  permissions: string[];
}

@Injectable()
export class ServiceClientSeederService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const raw = process.env.AUTH_SERVICE_CLIENTS_JSON;
    const clients = raw ? parseClients(raw) : [];
    await this.prisma.$transaction(async (transaction) => {
      await transaction.serviceClient.updateMany({
        where: { active: true },
        data: { active: false },
      });
      for (const client of clients) {
        const secretHash = createHash('sha256')
          .update(client.secret)
          .digest('hex');
        await transaction.serviceClient.upsert({
          where: { clientId: client.clientId },
          create: {
            clientId: client.clientId,
            secretHash,
            permissions: client.permissions,
            active: true,
          },
          update: {
            secretHash,
            permissions: client.permissions,
            active: true,
          },
        });
      }
    });
  }
}

function parseClients(raw: string): ServiceClientConfiguration[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('AUTH_SERVICE_CLIENTS_JSON must be a valid JSON array.');
  }
  if (!Array.isArray(value)) {
    throw new Error('AUTH_SERVICE_CLIENTS_JSON must be a valid JSON array.');
  }
  return value.map((client: unknown) => {
    if (
      typeof client !== 'object' ||
      client === null ||
      !('clientId' in client) ||
      !('secret' in client) ||
      !('permissions' in client) ||
      typeof client.clientId !== 'string' ||
      !/^[a-z][a-z0-9-]{1,63}$/.test(client.clientId) ||
      typeof client.secret !== 'string' ||
      client.secret.length < 32 ||
      !Array.isArray(client.permissions) ||
      client.permissions.some(
        (permission) => permission !== 'iam.session.introspect',
      )
    ) {
      throw new Error('AUTH_SERVICE_CLIENTS_JSON contains an invalid client.');
    }
    return {
      clientId: client.clientId,
      secret: client.secret,
      permissions: client.permissions as string[],
    };
  });
}
