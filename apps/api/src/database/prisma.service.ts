import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, createPrismaAdapter } from '@erp/database';
import type { Env } from '../config/env.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({ adapter: createPrismaAdapter(config.get('DATABASE_URL', { infer: true })) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
