import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';

@Module({
  controllers: [AuthController],
  // Global guard: every route in the app requires a session unless marked @Public().
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
