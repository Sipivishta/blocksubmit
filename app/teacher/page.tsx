// Teacher dashboard: /teacher
// Lists the teacher's own assignments (existing GET /api/assignments
// returns all assignments; this page additionally filters to teacher_id
// = the signed-in user, since that's what "my assignments" means here)
// plus a submission count per assignment, and the create-assignment form.
export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AssignmentForm } from '@/components/AssignmentForm';
import { StatCard } from '@/components/StatCard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Assignment } from '@/types';

export default async function TeacherDashboard() {
  let teacher;
  try {
    teacher = await requireRole('TEACHER');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('STUDENT'));
    throw err;
  }

  const supabase = await createServerClient();
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('deadline', { ascending: true });

  const assignmentIds = ((assignments ?? []) as Assignment[]).map((a) => a.id);
  const { data: submissions } = assignmentIds.length
    ? await supabase.from('submissions').select('id, assignment_id, status').in('assignment_id', assignmentIds)
    : { data: [] as { id: string; assignment_id: string; status: string }[] };

  const countByAssignment = new Map<string, number>();
  const confirmedByAssignment = new Map<string, number>();
  for (const s of submissions ?? []) {
    countByAssignment.set(s.assignment_id, (countByAssignment.get(s.assignment_id) ?? 0) + 1);
    if (s.status === 'CONFIRMED') {
      confirmedByAssignment.set(s.assignment_id, (confirmedByAssignment.get(s.assignment_id) ?? 0) + 1);
    }
  }

  const totalSubmissions = submissions?.length ?? 0;
  const totalConfirmed = (submissions ?? []).filter((s) => s.status === 'CONFIRMED').length;
  // "Pending review" is a UX label, not a status: any submission not yet
  // confirmed on-chain and not in a hard-failure state still needs the
  // teacher's attention once it does confirm — so we count everything that
  // isn't CONFIRMED or a *_FAILED terminal state.
  const pendingReview = (submissions ?? []).filter(
    (s) => !['CONFIRMED', 'UPLOAD_FAILED', 'HASH_FAILED'].includes(s.status)
  ).length;

  const stats = [
    { label: 'Assignments', value: ((assignments ?? []) as Assignment[]).length },
    { label: 'Total submissions', value: totalSubmissions },
    { label: 'Pending review', value: pendingReview },
    { label: 'Confirmed on-chain', value: totalConfirmed }
  ];

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <div className="page-intro">
          <p className="eyebrow">Teaching workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">Review with confidence.</h1>
          <p className="mt-2 text-sm text-ink-500">Signed in as {teacher.full_name}. Monitor submissions and their proof status in one place.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-ink-900">Your assignments</h2>
          <AssignmentForm />
        </div>

        <div className="mt-3 space-y-3">
          {((assignments ?? []) as Assignment[]).length === 0 && (
            <EmptyState
              title="No assignments yet"
              description="Create your first assignment to start collecting submissions."
            />
          )}

          {((assignments ?? []) as Assignment[]).map((assignment) => (
            <div key={assignment.id} className="card-padded">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-ink-900">
                    <Link href={`/assignments/${assignment.id}`} className="hover:underline">
                      {assignment.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs text-ink-400">
                    Deadline: {new Date(assignment.deadline).toLocaleString()}
                  </p>
                </div>
                <div className="text-right text-xs text-ink-400">
                  <p>{countByAssignment.get(assignment.id) ?? 0} submitted</p>
                  <p>{confirmedByAssignment.get(assignment.id) ?? 0} confirmed</p>
                </div>
              </div>
              <Link
                href={`/teacher/assignments/${assignment.id}`}
                className="mt-3 inline-block text-sm font-medium text-ink-900 underline"
              >
                View submissions →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
