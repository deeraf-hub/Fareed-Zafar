import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * A single Prisma client for the process. `datasources` is set explicitly so
 * the test environment can point at TEST_DATABASE_URL without touching the
 * developer's working database.
 */
export const prisma = new PrismaClient({
  datasources: { db: { url: env.databaseUrl } },
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

export type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
