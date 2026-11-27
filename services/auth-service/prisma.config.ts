import type { PrismaConfig } from 'prisma';
import { loadEnvironment } from './src/config/environment';

loadEnvironment();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Missing configuration: DATABASE_URL');
}

const config = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
} satisfies PrismaConfig;

export default config;
