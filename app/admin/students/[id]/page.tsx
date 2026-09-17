// Admin student detail: /admin/students/[id]
// Shows one student's profile and every submission they've made, each
// linking to the normal /submissions/[id] page (which already grants
// admins access via its own isAdmin check).
export const runtime = 'nodejs';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { StatusBadge } from '@/components/StatusBadge';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { PromoteToTeacherButton } from '@/components/PromoteToTeacherButton';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Assignment, Profile, Submission } from '@/types';

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireRole('ADMIN');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('STUDENT'));
    throw err;
  }

  const supabase = await createServerClient();
  const { data: student } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'STUDENT')
    .maybeSingle();

  if (!student) notFound();

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, assignments(title)')
    .eq('student_id', id)
    .order('created_at', { ascending: false });

  const s = student as Profile;
  const list = (submissions ?? []) as (Submission & { assignments: Pick<Assignment, 'title'> })[];

  return (
    <AppShell title="Student">
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <Link href="/admin/students" className="text-sm text-ink-400 hover:text-ink-900">
          ← Students
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">{s.full_name}</h1>
            {s.student_number && <p className="mt-1 text-sm text-ink-400">Student #{s.student_number}</p>}
          </div>
          <PromoteToTeacherButton userId={s.id} />
        </div>

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-400">Submissions</h2>
        <div className="mt-2 space-y-2">
          {list.length === 0 ? (
            <EmptyState title="No submissions" description="This student hasn't submitted any work yet." />
          ) : (
            list.map((submission) => (
              <Link
                key={submission.id}
                href={`/submissions/${submission.id}`}
                className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-4 py-3 hover:border-ink-300"
              >
                <span className="text-sm font-medium text-ink-900">{submission.assignments?.title ?? submission.file_name}</span>
                <StatusBadge status={submission.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
