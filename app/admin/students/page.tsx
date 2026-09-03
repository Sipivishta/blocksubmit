// Admin student list: /admin/students
// Read-only listing of every STUDENT profile with their submission count.
export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Profile } from '@/types';

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ promoted?: string }> }) {
  try {
    await requireRole('ADMIN');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('STUDENT'));
    throw err;
  }

  const resolvedSearchParams = await searchParams;

  const supabase = await createServerClient();
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'STUDENT')
    .order('full_name', { ascending: true });

  const studentIds = ((students ?? []) as Profile[]).map((s) => s.id);
  const { data: submissions } = studentIds.length
    ? await supabase.from('submissions').select('student_id').in('student_id', studentIds)
    : { data: [] as { student_id: string }[] };

  const countByStudent = new Map<string, number>();
  for (const s of submissions ?? []) countByStudent.set(s.student_id, (countByStudent.get(s.student_id) ?? 0) + 1);

  return (
    <AppShell title="Students">
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Link href="/admin" className="text-sm text-ink-400 hover:text-ink-900">
          ← Admin
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink-900">Students</h1>

        {resolvedSearchParams.promoted && (
          <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {resolvedSearchParams.promoted} has been promoted to teacher.
          </div>
        )}

        <div className="mt-6 space-y-2">
          {((students ?? []) as Profile[]).length === 0 ? (
            <EmptyState title="No student accounts yet" />
          ) : (
            ((students ?? []) as Profile[]).map((student) => (
              <Link
                key={student.id}
                href={`/admin/students/${student.id}`}
                className="card flex items-center justify-between px-4 py-4 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
              >
                <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">{student.full_name.slice(0, 1).toUpperCase()}</span><span className="truncate text-sm font-semibold text-ink-900">{student.full_name}</span></span>
                <span className="text-xs text-ink-400">{countByStudent.get(student.id) ?? 0} submissions</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
