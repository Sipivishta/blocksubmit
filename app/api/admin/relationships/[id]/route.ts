// DELETE /api/admin/relationships/[id] — unlink a teacher/student pair
// (ADMIN only). Only removes the link row itself — never touches
// assignments, submissions, grades, audit_logs, or any blockchain record.
// The FK from teacher_student_links to profiles is what gets deleted
// here, not anything profiles/assignments/submissions reference back to.
export const runtime = 'nodejs';

import { requireRole, authErrorResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/audit';
import { validateMutationOrigin } from '@/lib/request-origin';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;

  try {
    const admin = await requireRole('ADMIN');
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: link, error: fetchError } = await supabase
      .from('teacher_student_links')
      .select('*, teacher:teacher_id(full_name), student:student_id(full_name)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !link) {
      return Response.json({ error: 'Link not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.from('teacher_student_links').delete().eq('id', id);
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    await writeAuditLog({
      userId: admin.id,
      action: 'TEACHER_STUDENT_UNLINKED',
      resourceType: 'teacher_student_link',
      resourceId: id,
      metadata: { teacherId: link.teacher_id, studentId: link.student_id }
    });

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
