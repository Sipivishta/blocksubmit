// GET /api/submissions/[id]/download?mode=view|download — returns a
// short-lived presigned R2 URL after checking the caller owns the
// submission or teaches its assignment. The file is never streamed
// through this route and never exposed as a permanent link; the URL
// itself is never persisted to PostgreSQL, only generated fresh per
// request after the ownership check.
//
// `mode=view` requests an inline Content-Disposition (renders in the
// browser rather than downloading) — only honored for mime types the
// browser can actually render (PDF today). The eligibility check uses
// submissions.mime_type, which is the server-detected type from upload
// (detectValidatedMimeType in app/api/submissions/route.ts), never a
// client-supplied header — a request can't get inline behavior for a
// format the server didn't itself classify as safe to render. Any other
// mode value, or no mode at all, returns 'attachment' (a real download),
// which was the only behavior this route had before.
export const runtime = 'nodejs';

import { requireUser, authErrorResponse, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { getPresignedDownloadUrl } from '@/lib/r2';
import { writeAuditLog } from '@/lib/audit';

// Formats the browser can render natively inline. DOCX/PPTX are
// deliberately excluded — browsers don't reliably render them, and
// pretending otherwise (or piping through an external viewer, which
// would mean sending a private document's bytes to a third party) isn't
// something this route does.
const INLINE_VIEWABLE_MIME_TYPES = new Set(['application/pdf']);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const requestedMode = new URL(req.url).searchParams.get('mode');
    const canView = INLINE_VIEWABLE_MIME_TYPES.has(submission.mime_type);
    const disposition = requestedMode === 'view' && canView ? 'inline' : 'attachment';

    const url = await getPresignedDownloadUrl(submission.file_path, submission.file_name, disposition);

    await writeAuditLog({
      userId: user.id,
      action: 'FILE_ACCESSED',
      resourceType: 'submission',
      resourceId: submission.id,
      metadata: { mode: disposition }
    });

    return Response.json({
      url,
      mode: disposition,
      viewable: canView,
      expiresInSeconds: Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS ?? 300)
    });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
