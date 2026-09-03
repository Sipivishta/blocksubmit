// Admin page: /admin — system-level counts plus links into teacher and
// student management. RLS already grants admins full read access to
// every table; this page and its two sub-pages
// (/admin/teachers, /admin/students) surface that access as plain
// listing/detail views over the existing schema — no new tables, no new
// "mapping" concept. See README/report for why a separate student-teacher
// mapping table was deliberately NOT added: assignments already are the
// complete, correct definition of which students relate to which
// teacher, and every authorization check in this app already uses that,
// not a separate mapping.
export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { dashboardPathForRole } from '@/lib/redirect-for-role';

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
    { count: confirmedCount }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'TEACHER'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
    supabase.from('assignments').select('*', { count: 'exact', head: true }),
    supabase.from('submissions').select('*', { count: 'exact', head: true }),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMED')
  ]);

  const stats = [
    { label: 'Teachers', value: teacherCount ?? 0 },
    { label: 'Students', value: studentCount ?? 0 },
    { label: 'Assignments', value: assignmentCount ?? 0 },
    { label: 'Submissions', value: submissionCount ?? 0 },
    { label: 'Confirmed on-chain', value: confirmedCount ?? 0 }
  ];

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <div className="page-intro">
          <p className="eyebrow">System administration</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">Platform overview</h1>
          <p className="mt-2 text-sm text-ink-500">Signed in as {admin.full_name}. Keep the academic integrity network healthy.</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="card-padded">
              <p className="text-xs font-medium text-ink-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-ink-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/admin/teachers" className="card-padded block hover:border-ink-300">
            <p className="text-sm font-medium text-ink-900">Manage teachers →</p>
            <p className="mt-1 text-xs text-ink-400">View teachers and the assignments they own, add new accounts</p>
          </Link>
          <Link href="/admin/students" className="card-padded block hover:border-ink-300">
            <p className="text-sm font-medium text-ink-900">Manage students →</p>
            <p className="mt-1 text-xs text-ink-400">View students and their submission history</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
