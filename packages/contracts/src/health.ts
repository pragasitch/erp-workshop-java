import { oc } from '@orpc/contract';
import * as z from 'zod';

export const HealthCheckSchema = z.object({
  api: z.literal('ok'),
  database: z.enum(['ok', 'error']),
  timestamp: z.iso.datetime(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export const healthContract = {
  check: oc
    .route({
      method: 'GET',
      path: '/health',
      summary: 'Check that the API and the database are reachable',
      tags: ['Health'],
    })
    .output(HealthCheckSchema),
};
