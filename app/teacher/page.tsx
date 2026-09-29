export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { StatCard } from '@/components/StatCard';
import { AppShell } from '@/components/AppShell';
import { TeacherAssignmentList } from '@/components/TeacherAssignmentList';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Assignment } from '@/types';
import { BookOpen } from 'lucide-react';

export default async function TeacherDashboard() {
  let teacher;
  try {
    teacher = await requireRole('TEACHER');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('STUDENT'));
    throw err;
  }

  const supabase = await createServerClient();
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('deadline', { ascending: true });

  const assignmentList = (assignments ?? []) as Assignment[];
  const assignmentIds = assignmentList.map((a) => a.id);
  const { data: submissions } = assignmentIds.length
    ? await supabase.from('submissions').select('id, assignment_id, status').in('assignment_id', assignmentIds)
    : { data: [] as { id: string; assignment_id: string; status: string }[] };

  const countObj: Record<string, number> = {};
  const confirmedObj: Record<string, number> = {};

  for (const s of submissions ?? []) {
    countObj[s.assignment_id] = (countObj[s.assignment_id] ?? 0) + 1;
    if (s.status === 'CONFIRMED') {
      confirmedObj[s.assignment_id] = (confirmedObj[s.assignment_id] ?? 0) + 1;
    }
  }

  const totalSubmissions = submissions?.length ?? 0;
  const totalConfirmed = (submissions ?? []).filter((s) => s.status === 'CONFIRMED').length;
  const pendingReview = (submissions ?? []).filter(
    (s) => !['CONFIRMED', 'UPLOAD_FAILED', 'HASH_FAILED'].includes(s.status)
  ).length;

  const stats = [
    { label: 'Assignments', value: assignmentList.length, subtext: 'Owned coursework' },
    { label: 'Total submissions', value: totalSubmissions, subtext: 'Received work' },
    { label: 'Pending review', value: pendingReview, subtext: 'Awaiting grading' },
    { label: 'Confirmed on-chain', value: totalConfirmed, subtext: 'Integrity sealed' }
  ];

  return (
    <AppShell title="Teaching Workspace">
      <div className="mx-auto max-w-5xl p-4 sm:p-8 space-y-8">
        {/* Intro */}
        <div className="page-intro relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-violet-600 text-white shadow-lift">
              <BookOpen className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <p className="eyebrow text-violet-600">Instructor Workspace</p>
              <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                Review with confidence.
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-600 max-w-xl leading-relaxed">
            Signed in as <span className="font-semibold text-ink-900">{teacher.full_name}</span>. Create assignments, evaluate student submissions, and inspect immutable audit evidence.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} subtext={stat.subtext} />
          ))}
        </div>

        {/* Assignments section */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink-900 mb-4">Your Created Assignments</h2>
          <TeacherAssignmentList
            assignments={assignmentList}
            countByAssignment={countObj}
            confirmedByAssignment={confirmedObj}
          />
        </div>
      </div>
    </AppShell>
  );
}
