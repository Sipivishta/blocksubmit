export const runtime = 'nodejs';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser, UnauthorizedError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { SubmissionUploadForm } from '@/components/SubmissionUploadForm';
import { StatusBadge } from '@/components/StatusBadge';
import { EditAssignmentForm } from '@/components/EditAssignmentForm';
import { DeleteAssignmentButton } from '@/components/DeleteAssignmentButton';
import { AppShell } from '@/components/AppShell';
import type { Assignment, Profile, Submission } from '@/types';
import { ArrowLeft, Calendar, User, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

export default async function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    throw err;
  }

  const supabase = await createServerClient();
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', id).single();
  if (!assignment) notFound();

  const a = assignment as Assignment;
  const isOwner = user.role === 'TEACHER' && a.teacher_id === user.id;

  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('full_name, department')
    .eq('id', a.teacher_id)
    .maybeSingle();

  let mySubmission: Submission | null = null;
  if (user.role === 'STUDENT') {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', a.id)
      .eq('student_id', user.id)
      .maybeSingle();
    mySubmission = data as Submission | null;
  }

  const overdue = new Date(a.deadline).getTime() < Date.now();
  const teacher = teacherProfile as Pick<Profile, 'full_name' | 'department'> | null;

  return (
    <AppShell title="Assignment Details">
      <div className="mx-auto max-w-3xl p-4 sm:p-8 space-y-6">
        <div>
          <Link
            href={user.role === 'TEACHER' ? '/teacher' : '/student'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {user.role === 'TEACHER' ? 'Teaching Workspace' : 'Dashboard'}</span>
          </Link>

          <div className="page-intro">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Academic Coursework</p>
                <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{a.title}</h1>
                {teacher && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-ink-600">
                    <User className="h-3.5 w-3.5 text-ink-400" />
                    <span>Instructor: {teacher.full_name}</span>
                    {teacher.department && <span className="text-ink-400">· {teacher.department}</span>}
                  </div>
                )}
              </div>
              {mySubmission && <StatusBadge status={mySubmission.status} />}
            </div>
          </div>
        </div>

        {/* Description & Deadline Card */}
        <div className="card-padded bg-white shadow-card space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">Submission Guidelines</h2>
            {a.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{a.description}</p>
            ) : (
              <p className="text-sm text-ink-400 italic">No instructions provided for this assignment.</p>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-ink-100 pt-3 text-xs">
            <Calendar className="h-4 w-4 text-ink-400" />
            <span className={`font-semibold ${overdue ? 'text-amber-700' : 'text-ink-600'}`}>
              Deadline: {new Date(a.deadline).toLocaleString()}
              {overdue ? ' (Past Due)' : ''}
            </span>
          </div>
        </div>

        {/* Student Submission View/Form */}
        {user.role === 'STUDENT' && (
          <div>
            {mySubmission ? (
              <div className="card-padded bg-emerald-50/70 border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Work Submitted</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Your work has been fingerprinted and submitted. View your evidence dossier for status updates.
                </p>
                <Link
                  href={`/submissions/${mySubmission.id}`}
                  className="btn-primary py-2.5 px-4 text-xs inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 border-none shadow-sm"
                >
                  <span>View Submission & Proof</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <SubmissionUploadForm assignmentId={a.id} />
            )}
          </div>
        )}

        {/* Teacher Controls */}
        {isOwner && (
          <div className="card-padded bg-white space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">Instructor Controls</h2>
            <div className="flex flex-wrap gap-3">
              <EditAssignmentForm assignment={a} />
              <DeleteAssignmentButton assignmentId={a.id} />
            </div>
            <div className="border-t border-ink-100 pt-3">
              <Link
                href={`/teacher/assignments/${a.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
              >
                <span>View All Cohort Submissions</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
