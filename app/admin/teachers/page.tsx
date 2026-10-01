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
import { ArrowLeft, UserCheck, ArrowRight } from 'lucide-react';

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

  const teacherList = (teachers ?? []) as Profile[];
  const teacherIds = teacherList.map((t) => t.id);
  const { data: assignments } = teacherIds.length
    ? await supabase.from('assignments').select('teacher_id').in('teacher_id', teacherIds)
    : { data: [] as { teacher_id: string }[] };

  const countByTeacher = new Map<string, number>();
  for (const a of assignments ?? []) countByTeacher.set(a.teacher_id, (countByTeacher.get(a.teacher_id) ?? 0) + 1);

  return (
    <AppShell title="Instructors Directory">
      <div className="mx-auto max-w-4xl p-4 sm:p-8 space-y-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to System Overview</span>
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Teacher Accounts</h1>
              <p className="mt-1 text-xs text-ink-500">Manage instructor profiles and inspect owned course assignments.</p>
            </div>
            <CreateTeacherForm />
          </div>
        </div>

        <div className="space-y-3">
          {teacherList.length === 0 ? (
            <EmptyState title="No teacher accounts found" description="Provision instructor profiles using the button above." />
          ) : (
            teacherList.map((teacher) => (
              <Link
                key={teacher.id}
                href={`/admin/teachers/${teacher.id}`}
                className="card flex items-center justify-between px-5 py-4 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift transition-all bg-white group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-sm font-bold text-violet-800 shadow-sm">
                    {teacher.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-950 group-hover:text-brand-600 transition-colors">
                      {teacher.full_name}
                    </p>
                    {teacher.department && <p className="text-xs text-ink-400">{teacher.department}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-ink-50 border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700">
                    {countByTeacher.get(teacher.id) ?? 0} Assignments
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-brand-600 transition-colors" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
