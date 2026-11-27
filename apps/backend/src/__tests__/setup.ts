import { beforeAll, afterAll } from 'vitest';
import { db } from '../db';
beforeAll(async () => {
  if (process.env.DATABASE_URL) {
    if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) throw new Error('Tests require a separate database ending in _test');
    await db.prisma.$executeRaw`DELETE FROM "ApplicationState"`;
  } else db.resetToDefault();
});
afterAll(async () => { await db.prisma.$disconnect(); });
