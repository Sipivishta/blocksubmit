// GET /api/submissions/[id]/timeline — audit trail for one submission.
//
// audit_logs.user_id is the ACTOR (usually the student, for the upload
// pipeline steps), not the submission owner — so the existing "self read"
// RLS policy on audit_logs (see supabase/migrations/0001_init.sql) would
// hide a student's own upload events from the *teacher* viewing that
// submission, and vice versa. Rather than weaken audit_logs RLS (which
// would let any authenticated user broaden their read access), this route
// does the authorization itself — the same ownership check used by
// verify/retry/download — and then reads via the service-role client
// scoped to exactly this one resource_id. No other row becomes reachable.
export const runtime = 'nodejs';

import { requireUser, authErrorResponse, ForbiddenError } from '@/lib/auth';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('id, student_id, assignments!inner(teacher_id)')
      .eq('id', id)
      .single();

    if (error || !submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    const assignment = submission.assignments as unknown as { teacher_id: string };
    const isOwner = submission.student_id === user.id;
    const isAssignmentTeacher = assignment.teacher_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    if (!isOwner && !isAssignmentTeacher && !isAdmin) {
      throw new ForbiddenError('You do not have access to this submission');
    }

    const service = createServiceRoleClient();
    const { data: events, error: logError } = await service
      .from('audit_logs')
      .select('action, created_at, metadata')
      .eq('resource_type', 'submission')
      .eq('resource_id', id)
      .order('created_at', { ascending: true });

    if (logError) return Response.json({ error: logError.message }, { status: 500 });

    return Response.json({ events });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
