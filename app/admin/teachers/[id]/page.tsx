export const runtime = 'nodejs';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Assignment, Profile } from '@/types';
import { ArrowLeft, UserCheck, Calendar, ArrowRight } from 'lucide-react';

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
  const assignmentList = (assignments ?? []) as Assignment[];

  return (
    <AppShell title="Teacher Profile">
      <div className="mx-auto max-w-4xl p-4 sm:p-8 space-y-6">
        <div>
          <Link
            href="/admin/teachers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Teachers Directory</span>
          </Link>

          <div className="page-intro flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-bold text-white shadow-lift">
              {t.full_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="eyebrow text-violet-600">Instructor Account</p>
              <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{t.full_name}</h1>
              {t.department && <p className="text-xs text-ink-500 mt-0.5">{t.department}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">Owned Assignments ({assignmentList.length})</h2>

          {assignmentList.length === 0 ? (
            <EmptyState title="No assignments created" description="This teacher hasn't created any course assignments yet." />
          ) : (
            assignmentList.map((a) => (
              <Link
                key={a.id}
                href={`/teacher/assignments/${a.id}`}
                className="card flex items-center justify-between px-5 py-4 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift transition-all bg-white group"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold text-ink-950 group-hover:text-brand-600 transition-colors truncate">
                    {a.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-ink-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Deadline: {new Date(a.deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-brand-600">
                  <span>View Submissions</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
