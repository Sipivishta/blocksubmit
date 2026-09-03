// Submission details page: /submissions/[id]
// Shared between students (own submission) and teachers (submissions to
// their own assignments) — the rendered sections differ by role, but the
// authorization check is identical to, and no more permissive than, the
// one in the API routes (see the isOwner/isAssignmentTeacher/isAdmin
// pattern in app/api/submissions/[id]/verify|retry|download/route.ts).
export const runtime = 'nodejs';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser, UnauthorizedError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { StatusBadge } from '@/components/StatusBadge';
import { StateMachineStepper } from '@/components/StateMachineStepper';
import { VerifyIntegrityCard } from '@/components/VerifyIntegrityCard';
import { DownloadButton } from '@/components/DownloadButton';
import { RetryBlockchainButton } from '@/components/RetryBlockchainButton';
import { AuditTimeline } from '@/components/AuditTimeline';
import { GradeForm } from '@/components/GradeForm';
import { GradeDisplay } from '@/components/GradeDisplay';
import { CopyButton } from '@/components/CopyButton';
import { AppShell } from '@/components/AppShell';
import { RETRYABLE_STATUSES } from '@/types';
import type { Assignment, Grade, Submission } from '@/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">{children}</h2>;
}

export default async function SubmissionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    throw err;
  }

  const supabase = await createServerClient();
  const { data: submission } = await supabase
    .from('submissions')
    .select('*, assignments!inner(*)')
    .eq('id', id)
    .single();

  // A 404 here — never a 403 — for anything the RLS-scoped query can't
  // see, so a student probing another student's submission ID learns
  // nothing about whether it exists.
  if (!submission) notFound();

  const assignment = (submission as unknown as { assignments: Assignment }).assignments;
  const isOwner = submission.student_id === user.id;
  const isAssignmentTeacher = assignment.teacher_id === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAssignmentTeacher && !isAdmin) notFound();

  const { data: grade } = await supabase
    .from('grades')
    .select('*')
    .eq('submission_id', id)
    .maybeSingle();

  const s = submission as unknown as Submission;
  const canRetry = (isOwner || isAssignmentTeacher || isAdmin) && RETRYABLE_STATUSES.includes(s.status);
  const canGrade = isAssignmentTeacher || isAdmin;
  const canDownload = isOwner || isAssignmentTeacher || isAdmin;

  return (
    <AppShell title="Submission">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <Link
          href={isAssignmentTeacher || isAdmin ? `/teacher/assignments/${assignment.id}` : '/student'}
          className="text-sm text-ink-400 hover:text-ink-900"
        >
          ← Back
        </Link>

        <div className="page-intro mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Submission evidence</p>
            <h1 className="text-2xl font-semibold text-ink-900">{assignment.title}</h1>
            <p className="mt-2 truncate font-mono text-xs text-ink-500">{s.file_name}</p>
            <p className="mt-2 text-xs text-ink-400">Submitted {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'not yet timestamped'}</p>
          </div>
          <StatusBadge status={s.status} />
        </div>

        <div className="mt-4">
          <StateMachineStepper status={s.status} />
        </div>

        <div className="mt-6 space-y-6">
          <div className="card-padded surface-grid space-y-3">
            <SectionLabel>File</SectionLabel>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-ink-400">Filename</dt>
                <dd className="mt-0.5 text-ink-800">{s.file_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Size</dt>
                <dd className="mt-0.5 text-ink-800">{formatBytes(s.file_size)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-ink-400">Submitted</dt>
                <dd className="mt-0.5 text-ink-800">
                  {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {s.file_hash && (
            <div className="card-padded space-y-2">
              <SectionLabel>Cryptographic fingerprint</SectionLabel>
              <p className="text-xs text-ink-400">SHA-256, computed server-side from the exact uploaded bytes</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-md border border-brand-100 bg-white px-3 py-2 font-mono text-xs leading-5 text-ink-700">
                  {s.file_hash}
                </code>
                <CopyButton value={s.file_hash} />
              </div>
            </div>
          )}

          {(s.blockchain_tx_hash || s.blockchain_block_number != null) && (
            <div className="card-padded space-y-3">
              <SectionLabel>Blockchain proof</SectionLabel>
              <p className="text-xs text-ink-400">Immutable record on the Sepolia network</p>
              <dl className="space-y-3 text-sm">
                {s.blockchain_tx_hash && (
                  <div>
                    <dt className="text-xs text-ink-400">Transaction</dt>
                    <div className="mt-0.5 flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-ink-50 px-2 py-1.5 font-mono text-xs text-ink-700">
                        {s.blockchain_tx_hash}
                      </code>
                      <CopyButton value={s.blockchain_tx_hash} />
                    </div>
                  </div>
                )}
                <div className="flex gap-6">
                  {s.blockchain_block_number != null && (
                    <div>
                      <dt className="text-xs text-ink-400">Block</dt>
                      <dd className="mt-0.5 text-ink-800">{s.blockchain_block_number}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-ink-400">Network</dt>
                    <dd className="mt-0.5 text-ink-800">Sepolia</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">State</dt>
                    <dd className="mt-0.5">
                      <StatusBadge status={s.status} />
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          )}

          <div className="card-padded space-y-3">
            <SectionLabel>Storage</SectionLabel>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-600">
                {s.file_path ? 'File stored, accessible only via a short-lived signed link.' : 'Not yet stored.'}
              </p>
              {canDownload && <DownloadButton submissionId={s.id} />}
            </div>
          </div>

          {canRetry && <RetryBlockchainButton submissionId={s.id} />}

          {s.status === 'CONFIRMED' && (
            <div className="space-y-2">
              <SectionLabel>Integrity verification</SectionLabel>
              <VerifyIntegrityCard submissionId={s.id} />
            </div>
          )}

          <div className="space-y-2">
            <SectionLabel>Grade</SectionLabel>
            {canGrade ? (
              <GradeForm submissionId={s.id} existingGrade={(grade as Grade | null) ?? null} />
            ) : (
              <GradeDisplay grade={(grade as Grade | null) ?? null} />
            )}
          </div>

          <div className="space-y-2">
            <SectionLabel>Timeline</SectionLabel>
            <div className="card-padded">
              <AuditTimeline submissionId={s.id} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
