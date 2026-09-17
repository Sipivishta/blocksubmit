// GET  /api/admin/relationships — list teacher<->student links (ADMIN only),
//   optionally filtered by ?teacherId= or ?studentId=.
// POST /api/admin/relationships — create a link (ADMIN only).
//
// Uses the ordinary session-scoped client, not the service-role client —
// the "tsl: admin full access" RLS policy in
// supabase/migrations/0006_teacher_student_links.sql already grants an
// authenticated ADMIN full read/write on this table, so there's no need
// to bypass RLS here (same reasoning as the existing promote-to-teacher
// route).
export const runtime = 'nodejs';

import { z } from 'zod';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/audit';
import { validateMutationOrigin } from '@/lib/request-origin';

const createLinkSchema = z.object({
  teacherId: z.string().uuid(),
  studentId: z.string().uuid()
});

export async function GET(req: Request) {
  try {
    await requireRole('ADMIN');
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');

    const supabase = await createServerClient();
    let query = supabase.from('teacher_student_links').select('*').order('created_at', { ascending: false });
    if (teacherId) query = query.eq('teacher_id', teacherId);
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ links: data });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;

  try {
    const admin = await requireRole('ADMIN');
    const parsed = createLinkSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Validate both ids actually refer to a TEACHER and a STUDENT
    // respectively, so a link can't silently be created against a
    // mistyped id or the wrong role.
    const [{ data: teacher }, { data: student }] = await Promise.all([
      supabase.from('profiles').select('id, role, full_name').eq('id', parsed.data.teacherId).maybeSingle(),
      supabase.from('profiles').select('id, role, full_name').eq('id', parsed.data.studentId).maybeSingle()
    ]);
    if (!teacher || teacher.role !== 'TEACHER') {
      return Response.json({ error: 'teacherId does not refer to a teacher account' }, { status: 400 });
    }
    if (!student || student.role !== 'STUDENT') {
      return Response.json({ error: 'studentId does not refer to a student account' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('teacher_student_links')
      .insert({ teacher_id: parsed.data.teacherId, student_id: parsed.data.studentId, created_by: admin.id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'This teacher is already linked to this student' }, { status: 409 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    await writeAuditLog({
      userId: admin.id,
      action: 'TEACHER_STUDENT_LINKED',
      resourceType: 'teacher_student_link',
      resourceId: data.id,
      metadata: { teacherId: teacher.id, teacherName: teacher.full_name, studentId: student.id, studentName: student.full_name }
    });

    return Response.json({ link: data }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
