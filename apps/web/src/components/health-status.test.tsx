import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';
import { HealthStatus } from './health-status';

function renderWithQueryClient(ui: React.ReactElement) {
  return render(<QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>);
}

function mockHealthResponse(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body)),
  );
}

describe('HealthStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows API and database as ok', async () => {
    mockHealthResponse({ api: 'ok', database: 'ok', timestamp: new Date().toISOString() });

    renderWithQueryClient(<HealthStatus />);

    const database = (await screen.findByText('Database')).parentElement!;
    expect(await within(database).findByText('✅ ok')).toBeInTheDocument();
  });

  it('shows the database as down', async () => {
    mockHealthResponse({ api: 'ok', database: 'error', timestamp: new Date().toISOString() });

    renderWithQueryClient(<HealthStatus />);

    const database = (await screen.findByText('Database')).parentElement!;
    expect(await within(database).findByText('❌ down')).toBeInTheDocument();
  });
});
