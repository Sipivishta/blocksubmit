// GET  /api/grades?submissionId=... — fetch the grade for one submission.
//   RLS on `grades` already scopes this correctly: a student can read only
//   their own submission's grade, a teacher only for their own assignments,
//   an admin all — see supabase/migrations/0001_init.sql. This route just
//   runs the query through the session client; it adds no access beyond RLS.
// POST /api/grades — create/update a grade (TEACHER only, must own the
// assignment the submission belongs to). One grade per submission, so this
// is an upsert.
import { z } from 'zod';
import { requireUser, requireRole, authErrorResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/audit';
import { validateMutationOrigin } from '@/lib/request-origin';

const gradeSchema = z.object({
  submissionId: z.string().uuid(),
  marks: z.number().min(0).max(100),
  feedback: z.string().max(5000).optional()
});

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('submissionId');
    if (!submissionId) {
      return Response.json({ error: 'submissionId query param is required' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ grade: data });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;

  try {
    const teacher = await requireRole('TEACHER');
    const parsed = gradeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Ownership check: submission must belong to one of this teacher's assignments.
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('id, assignments!inner(teacher_id)')
      .eq('id', parsed.data.submissionId)
      .single();

    if (subError || !submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }
    // postgrest-js can't statically know assignment_id -> assignments is a
    // to-one relationship (no generated Database types in this project), so
    // it types the joined table as an array. It is a single row in practice
    // because assignment_id is a not-null FK to one assignment.
    const assignment = submission.assignments as unknown as { teacher_id: string };
    if (assignment.teacher_id !== teacher.id) {
      return Response.json({ error: 'Not your assignment' }, { status: 403 });
    }

    // Determine create-vs-update *before* the upsert, purely to pick the
    // right audit action label below — this read has no effect on the
    // write itself and doesn't gate it.
    const { data: existingGrade } = await supabase
      .from('grades')
      .select('id')
      .eq('submission_id', parsed.data.submissionId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('grades')
      .upsert(
        {
          submission_id: parsed.data.submissionId,
          teacher_id: teacher.id,
          marks: parsed.data.marks,
          feedback: parsed.data.feedback ?? null,
          graded_at: new Date().toISOString()
        },
        { onConflict: 'submission_id' }
      )
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Logged against the SUBMISSION (resource_type/resource_id), not the
    // grade row itself — this is what makes it show up in
    // GET /api/submissions/[id]/timeline, which filters on
    // resource_type='submission' AND resource_id=<submissionId>. Every
    // other event in a submission's timeline (SUBMISSION_CREATED,
    // FILE_UPLOADED, HASH_CREATED, BLOCKCHAIN_RECORDED,
    // VERIFICATION_REQUESTED, FILE_ACCESSED) already follows this same
    // convention; grading was the one path that logged against the grade's
    // own id instead, which is why it never appeared in the timeline
    // despite the write itself always succeeding. The grade's own id is
    // still kept, in metadata, for anyone querying audit_logs directly.
    await writeAuditLog({
      userId: teacher.id,
      action: existingGrade ? 'GRADE_UPDATED' : 'GRADE_CREATED',
      resourceType: 'submission',
      resourceId: parsed.data.submissionId,
      metadata: { gradeId: data.id, marks: parsed.data.marks }
    });

    return Response.json({ grade: data }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
