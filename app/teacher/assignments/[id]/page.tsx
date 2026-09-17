// Teacher's submissions list for one assignment: /teacher/assignments/[id]
// Ownership is enforced server-side here (teacher_id must match), not just
// implied by the RLS-scoped query — a teacher who guesses another
// teacher's assignment ID gets redirected, not a confusing empty page.
// ADMIN is also allowed through, matching the isOwner/isAdmin pattern
// already used on /submissions/[id] and every API route in this project —
// RLS already grants admins full read access to assignments/submissions
// (see supabase/migrations/0001_init.sql), this page just needs to agree.
export const runtime = 'nodejs';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser, UnauthorizedError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { StatusBadge } from '@/components/StatusBadge';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import type { Assignment, Profile, Submission } from '@/types';

export default async function AssignmentSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    throw err;
  }

  const supabase = await createServerClient();
  const { data: assignment } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single();

  const isOwner = (assignment as Assignment | null)?.teacher_id === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!assignment || (!isOwner && !isAdmin)) {
    notFound();
  }

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', id)
    .order('created_at', { ascending: false });

  const studentIds = ((submissions ?? []) as Submission[]).map((s) => s.student_id);
  const { data: students } = studentIds.length
    ? await supabase.from('profiles').select('id, full_name, student_number').in('id', studentIds)
    : { data: [] as Pick<Profile, 'id' | 'full_name' | 'student_number'>[] };

  const studentById = new Map((students ?? []).map((s) => [s.id, s]));
  const submissionList = (submissions ?? []) as Submission[];

  return (
    <AppShell title="Submissions">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <Link
          href={isAdmin ? `/admin/teachers/${(assignment as Assignment).teacher_id}` : '/teacher'}
          className="text-sm text-ink-400 hover:text-ink-900"
        >
          ← {isAdmin ? 'Teacher' : 'All assignments'}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">{(assignment as Assignment).title}</h1>
        <p className="mt-1 text-sm text-ink-400">
          Deadline: {new Date((assignment as Assignment).deadline).toLocaleString()}
        </p>

        {submissionList.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No submissions yet" description="Submissions will appear here once students turn in work." />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-ink-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {submissionList.map((submission) => {
                  const student = studentById.get(submission.student_id);
                  return (
                    <tr key={submission.id} className="border-b border-ink-100 last:border-0">
                      <td className="px-4 py-3">{student?.full_name ?? 'Unknown student'}</td>
                      <td className="px-4 py-3 text-ink-600">{submission.file_name}</td>
                      <td className="px-4 py-3 text-ink-600">
                        {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={submission.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/submissions/${submission.id}`} className="font-medium text-ink-900 underline">
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
