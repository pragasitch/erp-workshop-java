import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/lib/auth';

/** Layout route: renders its children for signed-in users, otherwise redirects to /login. */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  if (!session.data?.user) {
    const from = location.pathname + location.search;
    const search = from === '/' ? '' : `?redirect=${encodeURIComponent(from)}`;
    return <Navigate to={`/login${search}`} replace />;
  }

  return <Outlet />;
}
