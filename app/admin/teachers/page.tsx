// Admin teacher list: /admin/teachers
// Read-only listing of every TEACHER profile with their assignment count
// — plain queries against the existing schema (profiles.role, assignments
// grouped by teacher_id). No mapping table, no new schema: a teacher's
// "assignments" already are the complete, correct picture of what they
// own, exactly as every other page in this app already treats it.
export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { CreateTeacherForm } from '@/components/CreateTeacherForm';
import { EmptyState } from '@/components/EmptyState';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Profile } from '@/types';

export default async function AdminTeachersPage() {
  try {
    await requireRole('ADMIN');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('STUDENT'));
    throw err;
  }

  const supabase = await createServerClient();
  const { data: teachers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'TEACHER')
    .order('full_name', { ascending: true });

  const teacherIds = ((teachers ?? []) as Profile[]).map((t) => t.id);
  const { data: assignments } = teacherIds.length
    ? await supabase.from('assignments').select('teacher_id').in('teacher_id', teacherIds)
    : { data: [] as { teacher_id: string }[] };

  const countByTeacher = new Map<string, number>();
  for (const a of assignments ?? []) countByTeacher.set(a.teacher_id, (countByTeacher.get(a.teacher_id) ?? 0) + 1);

  return (
    <AppShell title="Teachers">
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-sm text-ink-400 hover:text-ink-900">
              ← Admin
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-ink-900">Teachers</h1>
          </div>
          <CreateTeacherForm />
        </div>

        <div className="mt-6 space-y-2">
          {((teachers ?? []) as Profile[]).length === 0 ? (
            <EmptyState title="No teacher accounts yet" description="Use the button above to add one." />
          ) : (
            ((teachers ?? []) as Profile[]).map((teacher) => (
              <Link
                key={teacher.id}
                href={`/admin/teachers/${teacher.id}`}
                className="card flex items-center justify-between px-4 py-4 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
              >
                <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{teacher.full_name.slice(0, 1).toUpperCase()}</span><span className="truncate text-sm font-semibold text-ink-900">{teacher.full_name}</span></span>
                <span className="text-xs text-ink-400">{countByTeacher.get(teacher.id) ?? 0} assignments</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
