// GET /api/submissions/[id]/similarity — teacher/admin only, scoped to
// their own assignment. Returns similarity matches involving this
// submission. Students get no access whatsoever — enforced both here
// (role check) and independently by RLS (submission_similarity_matches
// has no student-readable policy at all — see
// supabase/migrations/0007_similarity_matches.sql).
export const runtime = 'nodejs';

import { requireUser, authErrorResponse, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('id, assignment_id, assignments!inner(teacher_id)')
      .eq('id', id)
      .single();

    if (error || !submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    const assignment = submission.assignments as unknown as { teacher_id: string };
    const isAssignmentTeacher = assignment.teacher_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    if (!isAssignmentTeacher && !isAdmin) {
      // Explicitly includes the submission's own owning student — students
      // never see similarity results, including their own, per the
      // privacy requirement.
      throw new ForbiddenError('You do not have access to similarity results for this submission');
    }

    const { data: matches, error: matchError } = await supabase
      .from('submission_similarity_matches')
      .select('*')
      .or(`submission_id_a.eq.${id},submission_id_b.eq.${id}`)
      .order('similarity_score', { ascending: false });

    if (matchError) return Response.json({ error: matchError.message }, { status: 500 });

    // Resolve the "other" submission's owning student name for each
    // match, since the raw rows only have the paired submission id.
    const otherSubmissionIds = (matches ?? []).map((m) => (m.submission_id_a === id ? m.submission_id_b : m.submission_id_a));
    const { data: otherSubmissions } = otherSubmissionIds.length
      ? await supabase.from('submissions').select('id, student_id, file_name').in('id', otherSubmissionIds)
      : { data: [] as { id: string; student_id: string; file_name: string }[] };
    const studentIds = [...new Set((otherSubmissions ?? []).map((s) => s.student_id))];
    const { data: students } = studentIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', studentIds)
      : { data: [] as { id: string; full_name: string }[] };

    const subById = new Map((otherSubmissions ?? []).map((s) => [s.id, s]));
    const nameById = new Map((students ?? []).map((s) => [s.id, s.full_name]));

    const results = (matches ?? []).map((m) => {
      const otherId = m.submission_id_a === id ? m.submission_id_b : m.submission_id_a;
      const otherSub = subById.get(otherId);
      return {
        score: m.similarity_score,
        evidence: m.evidence,
        otherSubmissionId: otherId,
        otherStudentName: otherSub ? (nameById.get(otherSub.student_id) ?? 'Unknown student') : 'Unknown student'
      };
    });

    return Response.json({ matches: results });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
