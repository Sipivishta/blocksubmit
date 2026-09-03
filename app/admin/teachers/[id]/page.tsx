// Admin teacher detail: /admin/teachers/[id]
// Shows one teacher's profile and every assignment they own — again, a
// plain query against the existing schema (assignments.teacher_id), which
// is already the complete and correct definition of "this teacher's
// assignments" everywhere else in the app.
export const runtime = 'nodejs';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Assignment, Profile } from '@/types';

export default async function AdminTeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireRole('ADMIN');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('STUDENT'));
    throw err;
  }

  const supabase = await createServerClient();
  const { data: teacher } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'TEACHER')
    .maybeSingle();

  if (!teacher) notFound();

  const { data: assignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('teacher_id', id)
    .order('deadline', { ascending: true });

  const t = teacher as Profile;

  return (
    <AppShell title="Teacher">
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <Link href="/admin/teachers" className="text-sm text-ink-400 hover:text-ink-900">
          ← Teachers
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink-900">{t.full_name}</h1>
        {t.department && <p className="mt-1 text-sm text-ink-400">{t.department}</p>}

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-400">Assignments</h2>
        <div className="mt-2 space-y-2">
          {((assignments ?? []) as Assignment[]).length === 0 ? (
            <EmptyState title="No assignments" description="This teacher hasn't created any assignments yet." />
          ) : (
            ((assignments ?? []) as Assignment[]).map((a) => (
              <Link
                key={a.id}
                href={`/teacher/assignments/${a.id}`}
                className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-4 py-3 hover:border-ink-300"
              >
                <span className="text-sm font-medium text-ink-900">{a.title}</span>
                <span className="text-xs text-ink-400">{new Date(a.deadline).toLocaleDateString()}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
