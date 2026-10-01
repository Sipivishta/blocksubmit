export const runtime = 'nodejs';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser, UnauthorizedError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { SubmissionsTable } from '@/components/SubmissionsTable';
import { EmptyState } from '@/components/EmptyState';
import type { Assignment, Profile, Submission } from '@/types';
import { ArrowLeft, Calendar, FileCheck } from 'lucide-react';

export default async function AssignmentSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    throw err;
  }

  const supabase = await createServerClient();
  const { data: assignment } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single();

  const isOwner = (assignment as Assignment | null)?.teacher_id === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!assignment || (!isOwner && !isAdmin)) {
    notFound();
  }

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', id)
    .order('created_at', { ascending: false });

  const studentIds = ((submissions ?? []) as Submission[]).map((s) => s.student_id);
  const { data: students } = studentIds.length
    ? await supabase.from('profiles').select('id, full_name, student_number').in('id', studentIds)
    : { data: [] as Pick<Profile, 'id' | 'full_name' | 'student_number'>[] };

  const studentObj: Record<string, Pick<Profile, 'id' | 'full_name' | 'student_number'>> = {};
  for (const s of students ?? []) studentObj[s.id] = s;

  const submissionList = (submissions ?? []) as Submission[];

  return (
    <AppShell title="Assignment Submissions">
      <div className="mx-auto max-w-5xl p-4 sm:p-8 space-y-6">
        <div>
          <Link
            href={isAdmin ? `/admin/teachers/${(assignment as Assignment).teacher_id}` : '/teacher'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {isAdmin ? 'Teacher Profile' : 'Assignments'}</span>
          </Link>

          <div className="page-intro">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-violet-600 text-white shadow-lift">
                <FileCheck className="h-6 w-6 stroke-[2]" />
              </div>
              <div>
                <p className="eyebrow text-violet-600">Cohort Submissions</p>
                <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                  {(assignment as Assignment).title}
                </h1>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-ink-500 font-medium">
              <Calendar className="h-4 w-4 text-ink-400" />
              <span>Deadline: {new Date((assignment as Assignment).deadline).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {submissionList.length === 0 ? (
          <EmptyState
            title="No student submissions yet"
            description="Enrolled students have not submitted work for this assignment yet."
          />
        ) : (
          <SubmissionsTable submissions={submissionList} studentById={studentObj} />
        )}
      </div>
    </AppShell>
  );
}
