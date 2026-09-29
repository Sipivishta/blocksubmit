export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { StatCard } from '@/components/StatCard';
import { AppShell } from '@/components/AppShell';
import { StudentAssignmentList } from '@/components/StudentAssignmentList';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Assignment, Submission } from '@/types';
import { GraduationCap } from 'lucide-react';

export default async function StudentDashboard() {
  let student;
  try {
    student = await requireRole('STUDENT');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('TEACHER'));
    throw err;
  }

  const supabase = await createServerClient();
  const [{ data: assignments }, { data: submissions }] = await Promise.all([
    supabase.from('assignments').select('*').order('deadline', { ascending: true }),
    supabase.from('submissions').select('*').eq('student_id', student.id)
  ]);

  const allAssignments = (assignments ?? []) as Assignment[];
  const allSubmissions = (submissions ?? []) as Submission[];
  const submissionIds = allSubmissions.map((s) => s.id);

  const { count: gradedCount } = submissionIds.length
    ? await supabase.from('grades').select('*', { count: 'exact', head: true }).in('submission_id', submissionIds)
    : { count: 0 };

  const stats = [
    { label: 'Active assignments', value: allAssignments.length, subtext: 'Enrolled coursework' },
    { label: 'Submitted', value: allSubmissions.length, subtext: 'Files uploaded' },
    { label: 'Confirmed', value: allSubmissions.filter((s) => s.status === 'CONFIRMED').length, subtext: 'Recorded on Sepolia' },
    { label: 'Graded', value: gradedCount ?? 0, subtext: 'Evaluated by instructor' }
  ];

  return (
    <AppShell title="Student Dashboard">
      <div className="mx-auto max-w-5xl p-4 sm:p-8 space-y-8">
        {/* Banner */}
        <div className="page-intro relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-600 text-white shadow-lift">
              <GraduationCap className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <p className="eyebrow">Student Workspace</p>
              <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                Welcome back, {student.full_name}
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-600 max-w-xl leading-relaxed">
            Submit coursework, track cryptographic hash generation, and view immutable on-chain proof for all your academic assignments.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} subtext={stat.subtext} />
          ))}
        </div>

        {/* Assignments Section */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink-900 mb-4">Your Course Assignments</h2>
          <StudentAssignmentList assignments={allAssignments} submissions={allSubmissions} />
        </div>
      </div>
    </AppShell>
  );
}
