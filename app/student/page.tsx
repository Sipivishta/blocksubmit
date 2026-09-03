// Student dashboard: /student
// Lists all assignments with each one's submission status, matching the
// existing GET /api/assignments and GET /api/submissions data (queried
// directly here via the server-side Supabase client — the same RLS-scoped
// client the API routes use, so this page can see nothing more than the
// API would allow).
export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { SubmissionUploadForm } from '@/components/SubmissionUploadForm';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Assignment, Submission } from '@/types';

export default async function StudentDashboard() {
  let student;
  try {
    student = await requireRole('STUDENT');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('TEACHER')); // only STUDENT reaches here otherwise
    throw err;
  }

  const supabase = await createServerClient();
  const [{ data: assignments }, { data: submissions }] = await Promise.all([
    supabase.from('assignments').select('*').order('deadline', { ascending: true }),
    supabase.from('submissions').select('*').eq('student_id', student.id)
  ]);

  const submissionByAssignment = new Map<string, Submission>();
  for (const s of (submissions ?? []) as Submission[]) submissionByAssignment.set(s.assignment_id, s);

  const allSubmissions = (submissions ?? []) as Submission[];
  const submissionIds = allSubmissions.map((s) => s.id);
  const { count: gradedCount } = submissionIds.length
    ? await supabase.from('grades').select('*', { count: 'exact', head: true }).in('submission_id', submissionIds)
    : { count: 0 };

  const stats = [
    { label: 'Active assignments', value: ((assignments ?? []) as Assignment[]).length },
    { label: 'Submitted', value: allSubmissions.length },
    { label: 'Confirmed', value: allSubmissions.filter((s) => s.status === 'CONFIRMED').length },
    { label: 'Graded', value: gradedCount ?? 0 }
  ];

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <div className="page-intro">
          <p className="eyebrow">Student workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">Welcome, {student.full_name}</h1>
          <p className="mt-2 text-sm text-ink-500">Keep your submissions moving from upload to verified proof.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>

        <h2 className="mt-10 text-lg font-semibold text-ink-900">Your assignments</h2>
        <div className="mt-3 space-y-4">
          {((assignments ?? []) as Assignment[]).length === 0 && (
            <EmptyState
              title="No assignments yet"
              description="Your teachers haven't posted any assignments. Check back soon."
            />
          )}

          {((assignments ?? []) as Assignment[]).map((assignment) => {
            const submission = submissionByAssignment.get(assignment.id);
            const overdue = new Date(assignment.deadline).getTime() < Date.now();

            return (
              <div key={assignment.id} className="card-padded">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-ink-900">
                      <Link href={`/assignments/${assignment.id}`} className="hover:underline">
                        {assignment.title}
                      </Link>
                    </h3>
                    {assignment.description && (
                      <p className="mt-1 text-sm text-ink-600">{assignment.description}</p>
                    )}
                    <p className={`mt-2 text-xs ${overdue && !submission ? 'text-red-600' : 'text-ink-400'}`}>
                      Deadline: {new Date(assignment.deadline).toLocaleString()}
                      {overdue && !submission ? ' (past due)' : ''}
                    </p>
                  </div>
                  {submission && <StatusBadge status={submission.status} />}
                </div>

                <div className="mt-4">
                  {submission ? (
                    <Link
                      href={`/submissions/${submission.id}`}
                      className="text-sm font-medium text-ink-900 underline"
                    >
                      View submission →
                    </Link>
                  ) : (
                    <SubmissionUploadForm assignmentId={assignment.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
