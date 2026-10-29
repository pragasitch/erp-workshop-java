import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { clearSession, useCurrentUser } from '@/lib/auth';
import { orpc } from '@/lib/orpc';

export function UserMenu() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const logout = useMutation(
    orpc.auth.logout.mutationOptions({ onSuccess: () => clearSession(queryClient) }),
  );

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 text-sm font-normal">
      <span>{user.name}</span>
      <Badge variant="secondary">{user.role}</Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => logout.mutate({})}
        disabled={logout.isPending}
      >
        <LogOut />
        Log out
      </Button>
    </div>
  );
}
