// Assignment details page: /assignments/[id]
// Shared across all roles — any authenticated user can view an assignment
// (matches the existing "assignments: everyone authenticated can read" RLS
// policy; there's no ownership restriction on reading). What's rendered
// below the shared info differs by role/ownership:
//   - STUDENT: their own submission status + a Submit/View action
//   - the assignment's own TEACHER: edit/delete controls + a link to the
//     submissions list at /teacher/assignments/[id]
//   - anyone else (a different teacher, an admin): read-only
export const runtime = 'nodejs';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser, UnauthorizedError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { SubmissionUploadForm } from '@/components/SubmissionUploadForm';
import { StatusBadge } from '@/components/StatusBadge';
import { EditAssignmentForm } from '@/components/EditAssignmentForm';
import { DeleteAssignmentButton } from '@/components/DeleteAssignmentButton';
import { AppShell } from '@/components/AppShell';
import type { Assignment, Profile, Submission } from '@/types';

export default async function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    throw err;
  }

  const supabase = await createServerClient();
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', id).single();
  if (!assignment) notFound();

  const a = assignment as Assignment;
  const isOwner = user.role === 'TEACHER' && a.teacher_id === user.id;

  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('full_name, department')
    .eq('id', a.teacher_id)
    .maybeSingle();

  let mySubmission: Submission | null = null;
  if (user.role === 'STUDENT') {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', a.id)
      .eq('student_id', user.id)
      .maybeSingle();
    mySubmission = data as Submission | null;
  }

  const overdue = new Date(a.deadline).getTime() < Date.now();
  const teacher = teacherProfile as Pick<Profile, 'full_name' | 'department'> | null;

  return (
    <AppShell title="Assignment">
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <Link
          href={user.role === 'TEACHER' ? '/teacher' : '/student'}
          className="text-sm text-ink-400 hover:text-ink-900"
        >
          ← Back
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">{a.title}</h1>
            {teacher && (
              <p className="mt-1 text-sm text-ink-400">
                {teacher.full_name}
                {teacher.department ? ` · ${teacher.department}` : ''}
              </p>
            )}
          </div>
          {mySubmission && <StatusBadge status={mySubmission.status} />}
        </div>

        <div className="mt-6 card-padded">
          {a.description ? (
            <p className="whitespace-pre-wrap text-sm text-ink-700">{a.description}</p>
          ) : (
            <p className="text-sm text-ink-300">No description provided.</p>
          )}
          <p className={`mt-4 text-sm ${overdue ? 'text-red-600' : 'text-ink-400'}`}>
            Deadline: {new Date(a.deadline).toLocaleString()}
            {overdue ? ' (past due)' : ''}
          </p>
        </div>

        {user.role === 'STUDENT' && (
          <div className="mt-6">
            {mySubmission ? (
              <Link href={`/submissions/${mySubmission.id}`} className="text-sm font-medium text-ink-900 underline">
                View your submission →
              </Link>
            ) : (
              <SubmissionUploadForm assignmentId={a.id} />
            )}
          </div>
        )}

        {isOwner && (
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              <EditAssignmentForm assignment={a} />
              <DeleteAssignmentButton assignmentId={a.id} />
            </div>
            <Link href={`/teacher/assignments/${a.id}`} className="block text-sm font-medium text-ink-900 underline">
              View submissions →
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
