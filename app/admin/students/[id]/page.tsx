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
import { ArrowLeft, GraduationCap, ArrowRight } from 'lucide-react';

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
    <AppShell title="Student Profile">
      <div className="mx-auto max-w-4xl p-4 sm:p-8 space-y-6">
        <div>
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Students Directory</span>
          </Link>

          <div className="page-intro flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-lift">
                {s.full_name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="eyebrow text-emerald-600">Student Account</p>
                <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{s.full_name}</h1>
                {s.student_number && <p className="text-xs text-ink-500 mt-0.5">Student ID #{s.student_number}</p>}
              </div>
            </div>
            <PromoteToTeacherButton userId={s.id} />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">Submission History ({list.length})</h2>

          {list.length === 0 ? (
            <EmptyState title="No submissions recorded" description="This student hasn't submitted any work yet." />
          ) : (
            list.map((submission) => (
              <Link
                key={submission.id}
                href={`/submissions/${submission.id}`}
                className="card flex items-center justify-between px-5 py-4 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift transition-all bg-white group"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold text-ink-950 group-hover:text-brand-600 transition-colors truncate">
                    {submission.assignments?.title ?? submission.file_name}
                  </p>
                  <p className="text-xs text-ink-400 font-mono truncate">{submission.file_name}</p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={submission.status} />
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
