import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

// oRPC parses request bodies itself, so Nest's body parser is turned off.
const app = await NestFactory.create(AppModule, { bodyParser: false });

app.setGlobalPrefix('api');
app.enableShutdownHooks();

const config = app.get<ConfigService<Env, true>>(ConfigService);
const port = config.get('PORT', { infer: true });

await app.listen(port);
console.log(`API ready on http://localhost:${port}/api (docs: /api/docs)`);
