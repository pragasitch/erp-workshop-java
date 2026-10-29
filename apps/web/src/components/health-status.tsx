import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { orpc } from '@/lib/orpc';

function StatusBadge({ ok }: { ok: boolean }) {
  return <Badge variant={ok ? 'default' : 'destructive'}>{ok ? '✅ ok' : '❌ down'}</Badge>;
}

/** Calls GET /api/health through the typed oRPC client. */
export function HealthStatus() {
  const health = useQuery(orpc.health.check.queryOptions());

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>
          {health.isPending
            ? 'Checking…'
            : health.data
              ? `Last checked ${new Date(health.data.timestamp).toLocaleTimeString()}`
              : 'Could not reach the API'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span>API</span>
          {!health.isPending && <StatusBadge ok={health.data?.api === 'ok'} />}
        </div>
        <div className="flex items-center justify-between">
          <span>Database</span>
          {!health.isPending && <StatusBadge ok={health.data?.database === 'ok'} />}
        </div>
      </CardContent>
    </Card>
  );
}
