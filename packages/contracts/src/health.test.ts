import { describe, expect, it } from 'vitest';
import { HealthCheckSchema } from './health.js';

describe('HealthCheckSchema', () => {
  it('accepts a healthy response', () => {
    const result = HealthCheckSchema.safeParse({
      api: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown database status', () => {
    const result = HealthCheckSchema.safeParse({
      api: 'ok',
      database: 'maybe',
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });
});
