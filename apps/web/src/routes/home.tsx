import { HealthStatus } from '@/components/health-status';

export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome 👋</h1>
        <p className="text-muted-foreground">
          The stack is up. We will build the ERP features together in the workshop.
        </p>
      </div>
      <HealthStatus />
    </div>
  );
}
