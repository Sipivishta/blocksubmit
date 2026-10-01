export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import { Shield, UserCheck, Users, GitFork, ArrowRight, Activity } from 'lucide-react';

export default async function AdminPage() {
  let admin;
  try {
    admin = await requireRole('ADMIN');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('STUDENT'));
    throw err;
  }

  const supabase = await createServerClient();
  const [
    { count: teacherCount },
    { count: studentCount },
    { count: assignmentCount },
    { count: submissionCount },
    { count: confirmedCount },
    { count: linkCount }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'TEACHER'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
    supabase.from('assignments').select('*', { count: 'exact', head: true }),
    supabase.from('submissions').select('*', { count: 'exact', head: true }),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMED'),
    supabase.from('teacher_student_links').select('*', { count: 'exact', head: true })
  ]);

  const stats = [
    { label: 'Teachers', value: teacherCount ?? 0, subtext: 'Enrolled instructors' },
    { label: 'Students', value: studentCount ?? 0, subtext: 'Registered students' },
    { label: 'Relationships', value: linkCount ?? 0, subtext: 'Active teacher-student links' },
    { label: 'Assignments', value: assignmentCount ?? 0, subtext: 'Active course assignments' },
    { label: 'Submissions', value: submissionCount ?? 0, subtext: 'Total files processed' },
    { label: 'Confirmed on-chain', value: confirmedCount ?? 0, subtext: 'Sepolia proofs sealed' }
  ];

  return (
    <AppShell title="System Overview">
      <div className="mx-auto max-w-5xl p-4 sm:p-8 space-y-8">
        <div className="page-intro relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-lift">
              <Shield className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <p className="eyebrow text-emerald-600">Platform Administration</p>
              <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">System Overview</h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-600 max-w-xl leading-relaxed">
            Signed in as <span className="font-semibold text-ink-900">{admin.full_name}</span>. Monitor system health, provision teacher accounts, and manage student enrollment access.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} subtext={stat.subtext} />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/admin/teachers"
            className="card-padded bg-white hover:border-brand-200 hover:shadow-lift transition-all space-y-2 group"
          >
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-700 w-fit">
              <UserCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-ink-900 flex items-center justify-between group-hover:text-brand-600">
              <span>Manage Teachers</span>
              <ArrowRight className="h-4 w-4" />
            </h3>
            <p className="text-xs text-ink-500 leading-relaxed">
              Provision teacher accounts, inspect owned assignments, and handle role promotions.
            </p>
          </Link>

          <Link
            href="/admin/students"
            className="card-padded bg-white hover:border-brand-200 hover:shadow-lift transition-all space-y-2 group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 w-fit">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-ink-900 flex items-center justify-between group-hover:text-brand-600">
              <span>Manage Students</span>
              <ArrowRight className="h-4 w-4" />
            </h3>
            <p className="text-xs text-ink-500 leading-relaxed">
              Inspect student accounts, view submission histories, and manage student role statuses.
            </p>
          </Link>

          <Link
            href="/admin/relationships"
            className="card-padded bg-white hover:border-brand-200 hover:shadow-lift transition-all space-y-2 group"
          >
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 w-fit">
              <GitFork className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-ink-900 flex items-center justify-between group-hover:text-brand-600">
              <span>Manage Relationships</span>
              <ArrowRight className="h-4 w-4" />
            </h3>
            <p className="text-xs text-ink-500 leading-relaxed">
              Control student-teacher enrollment pairings and submission visibility permissions.
            </p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
