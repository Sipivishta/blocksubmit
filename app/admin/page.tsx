// Admin page: /admin — system-level counts plus links into teacher,
// student, and relationship management. RLS already grants admins full
// read access to every table; this page and its sub-pages
// (/admin/teachers, /admin/students, /admin/relationships) surface that
// access as listing/detail/management views over the schema.
//
// A submission's responsible teacher is still derived via
// assignment_id -> assignments.teacher_id, exactly as before — that part
// of the model is unchanged. teacher_student_links
// (supabase/migrations/0006_teacher_student_links.sql) adds a separate,
// admin-controlled layer on top of that: which teachers a student is
// even allowed to see assignments from and submit work to in the first
// place. It doesn't replace the assignment-ownership model; it gates
// access to it.
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
    { label: 'Teachers', value: teacherCount ?? 0 },
    { label: 'Students', value: studentCount ?? 0 },
    { label: 'Relationships', value: linkCount ?? 0 },
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

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/admin/teachers" className="card-padded block hover:border-ink-300">
            <p className="text-sm font-medium text-ink-900">Manage teachers →</p>
            <p className="mt-1 text-xs text-ink-400">View teachers and the assignments they own, add new accounts</p>
          </Link>
          <Link href="/admin/students" className="card-padded block hover:border-ink-300">
            <p className="text-sm font-medium text-ink-900">Manage students →</p>
            <p className="mt-1 text-xs text-ink-400">View students and their submission history</p>
          </Link>
          <Link href="/admin/relationships" className="card-padded block hover:border-ink-300">
            <p className="text-sm font-medium text-ink-900">Manage relationships →</p>
            <p className="mt-1 text-xs text-ink-400">Control which teachers a student can see and submit to</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
