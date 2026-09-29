export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Profile } from '@/types';
import { ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';

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

  const studentList = (students ?? []) as Profile[];
  const studentIds = studentList.map((s) => s.id);
  const { data: submissions } = studentIds.length
    ? await supabase.from('submissions').select('student_id').in('student_id', studentIds)
    : { data: [] as { student_id: string }[] };

  const countByStudent = new Map<string, number>();
  for (const s of submissions ?? []) countByStudent.set(s.student_id, (countByStudent.get(s.student_id) ?? 0) + 1);

  return (
    <AppShell title="Students Directory">
      <div className="mx-auto max-w-4xl p-4 sm:p-8 space-y-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to System Overview</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Student Accounts</h1>
            <p className="mt-1 text-xs text-ink-500">Manage enrolled student profiles and view submission histories.</p>
          </div>
        </div>

        {resolvedSearchParams.promoted && (
          <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{resolvedSearchParams.promoted} has been successfully promoted to a Teacher account.</span>
          </div>
        )}

        <div className="space-y-3">
          {studentList.length === 0 ? (
            <EmptyState title="No student accounts registered yet" />
          ) : (
            studentList.map((student) => (
              <Link
                key={student.id}
                href={`/admin/students/${student.id}`}
                className="card flex items-center justify-between px-5 py-4 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift transition-all bg-white group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-bold text-emerald-800 shadow-sm">
                    {student.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-950 group-hover:text-brand-600 transition-colors">
                      {student.full_name}
                    </p>
                    {student.student_number && <p className="text-xs text-ink-400">ID: {student.student_number}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-ink-50 border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700">
                    {countByStudent.get(student.id) ?? 0} Submissions
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
