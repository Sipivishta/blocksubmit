// Auth + RBAC helpers shared by every protected API route and server
// component. Authorization is ALWAYS re-checked here server-side —
// the frontend's role-based UI is a convenience, never a security boundary.
import { createServerClient } from './supabase-server';
import type { Profile, UserRole } from '@/types';

export class UnauthorizedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Not authorized for this action') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Resolve the current authenticated user's profile, or throw. */
export async function requireUser(): Promise<Profile> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError();
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new UnauthorizedError('Profile not found for authenticated user');
  }

  return profile as Profile;
}

/** Resolve the current user and assert their role is one of `roles`. */
export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await requireUser();
  if (!roles.includes(profile.role)) {
    throw new ForbiddenError(`Requires role: ${roles.join(' or ')}`);
  }
  return profile;
}

/** Map thrown auth errors to the right HTTP status + JSON body. */
export function authErrorResponse(err: unknown): Response | null {
  if (err instanceof UnauthorizedError) {
    return Response.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return Response.json({ error: err.message }, { status: 403 });
  }
  return null;
}
