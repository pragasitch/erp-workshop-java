import { describe, expect, it } from 'vitest';
import { createPrismaClient } from './index.js';

describe('createPrismaClient', () => {
  it('creates a client without connecting to the database', async () => {
    const prisma = createPrismaClient('postgresql://user:pass@localhost:5432/db');

    expect(typeof prisma.$queryRaw).toBe('function');
    await prisma.$disconnect();
  });
});
