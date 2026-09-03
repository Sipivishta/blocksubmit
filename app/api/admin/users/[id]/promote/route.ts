// PATCH /api/admin/users/[id]/promote — ADMIN-only. Promotes an existing
// STUDENT account to TEACHER.
//
// This does NOT invite or create a brand-new user (that would need
// Supabase's Admin API — service-role only, and a much larger feature:
// sending an invite email, a signup flow for the invitee, etc.). This is
// the narrower, already-fully-supported operation: turning an existing
// registered account into a teacher, which is what "add a teacher" means
// in a system where every account starts as a student at signup.
//
// Uses the ordinary session-scoped client, not the service-role client.
// supabase/migrations/0001_init.sql's prevent_role_self_escalation()
// trigger already has the exact carve-out this needs: a role change is
// allowed when the acting user is an ADMIN changing someone ELSE's role
// (auth.uid() != the row being changed). The RLS policy on `profiles`
// only restricts *whose* row can be touched (their own), so an admin
// changing another user's role also needs no RLS change — it already
// works today, verified directly against the real migration SQL before
// writing this route.
export const runtime = 'nodejs';

import { requireRole, authErrorResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/audit';
import { validateMutationOrigin } from '@/lib/request-origin';

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = validateMutationOrigin(_req);
  if (originError) return originError;

  try {
    const admin = await requireRole('ADMIN');
    const { id } = await params;

    if (id === admin.id) {
      return Response.json({ error: 'You cannot change your own role here' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: target, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', id)
      .single();

    if (fetchError || !target) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.role !== 'STUDENT') {
      return Response.json({ error: `Cannot promote a user with role ${target.role}` }, { status: 409 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'TEACHER' })
      .eq('id', id)
      .select('id, full_name, role')
      .single();

    if (updateError) {
      console.error('Failed to promote user', updateError);
      return Response.json({ error: 'Could not update role' }, { status: 500 });
    }

    await writeAuditLog({
      userId: admin.id,
      action: 'USER_PROMOTED_TO_TEACHER',
      resourceType: 'profile',
      resourceId: id,
      metadata: { promotedFullName: target.full_name }
    });

    return Response.json({ profile: updated });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
