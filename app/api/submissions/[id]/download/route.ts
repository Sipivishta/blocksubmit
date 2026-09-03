// GET /api/submissions/[id]/download — returns a short-lived presigned R2
// URL after checking the caller owns the submission or teaches its
// assignment. The file is never streamed through this route and never
// exposed as a permanent link; the URL itself is never persisted to
// PostgreSQL, only generated fresh per request after the ownership check.
export const runtime = 'nodejs';

import { requireUser, authErrorResponse, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { getPresignedDownloadUrl } from '@/lib/r2';
import { writeAuditLog } from '@/lib/audit';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*, assignments!inner(teacher_id)')
      .eq('id', id)
      .single();

    if (error || !submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    // postgrest-js join-typing note: see app/api/grades/route.ts.
    const assignment = submission.assignments as unknown as { teacher_id: string };
    const isOwner = submission.student_id === user.id;
    const isTeacher = assignment.teacher_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    if (!isOwner && !isTeacher && !isAdmin) {
      throw new ForbiddenError('You do not have access to this file');
    }
    if (!submission.file_path) {
      return Response.json({ error: 'File is not yet available for this submission' }, { status: 409 });
    }

    const url = await getPresignedDownloadUrl(submission.file_path, submission.file_name);

    await writeAuditLog({
      userId: user.id,
      action: 'FILE_ACCESSED',
      resourceType: 'submission',
      resourceId: submission.id
    });

    return Response.json({ url, expiresInSeconds: Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS ?? 300) });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
