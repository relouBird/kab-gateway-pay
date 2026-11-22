import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  BUILT_IN_ROLES,
  ROLE_PERMISSIONS,
  type BuiltInRole,
} from '@kgpay/contracts';
import { randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service';

const ROLE_NAMES: Record<BuiltInRole, string> = {
  CUSTOMER: 'Customer',
  GLOBAL_SUPER_ADMIN: 'Global super administrator',
  OPERATIONS_ADMIN: 'Operations administrator',
  CONFIGURATION_ADMIN: 'Configuration administrator',
};

@Injectable()
export class RoleSeederService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      for (const code of BUILT_IN_ROLES) {
        const role = await transaction.role.upsert({
          where: { code },
          create: {
            id: randomUUID(),
            code,
            name: ROLE_NAMES[code],
            builtIn: true,
          },
          update: {
            name: ROLE_NAMES[code],
            builtIn: true,
          },
        });
        await transaction.rolePermission.deleteMany({
          where: { roleId: role.id },
        });
        const permissions = ROLE_PERMISSIONS[code];
        if (permissions.length) {
          await transaction.rolePermission.createMany({
            data: permissions.map((permission) => ({
              roleId: role.id,
              permission,
            })),
          });
        }
      }
    });
  }
}
