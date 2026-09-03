// Shared client-side redirect target per role, used right after login and
// by the Nav's "Dashboard" link. This is a UX convenience only — every
// page it points to re-checks the role server-side (see lib/auth.ts); a
// student who edits this mapping or the URL bar gets redirected right back
// by the page itself, not blocked by this function.
import type { UserRole } from '@/types';

export function dashboardPathForRole(role: UserRole): string {
  if (role === 'TEACHER') return '/teacher';
  if (role === 'ADMIN') return '/admin';
  return '/student';
}
