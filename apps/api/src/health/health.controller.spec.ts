import { Test } from '@nestjs/testing';
import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { HealthController } from './health.controller.js';

async function createController(queryRaw: () => Promise<unknown>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: PrismaService, useValue: { $queryRaw: vi.fn(queryRaw) } }],
  }).compile();

  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('reports the database as ok when the query succeeds', async () => {
    const controller = await createController(() => Promise.resolve([{ '?column?': 1 }]));

    await expect(call(controller.check(), undefined)).resolves.toMatchObject({
      api: 'ok',
      database: 'ok',
    });
  });

  it('reports the database as error when the query fails', async () => {
    const controller = await createController(() => Promise.reject(new Error('down')));

    await expect(call(controller.check(), undefined)).resolves.toMatchObject({
      api: 'ok',
      database: 'error',
    });
  });
});
