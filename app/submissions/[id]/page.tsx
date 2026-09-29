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
import { SimilarityCard } from '@/components/SimilarityCard';
import { CopyButton } from '@/components/CopyButton';
import { AppShell } from '@/components/AppShell';
import { RETRYABLE_STATUSES } from '@/types';
import type { Assignment, Grade, Submission } from '@/types';
import { 
  ArrowLeft, 
  FileText, 
  Hash, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  Award, 
  GitBranch, 
  History,
  Calendar
} from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <Icon className="h-4 w-4 text-brand-600 shrink-0" />
      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</h2>
    </div>
  );
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
    <AppShell title="Submission Evidence">
      <div className="mx-auto max-w-5xl p-4 sm:p-8 space-y-6">
        <div>
          <Link
            href={isAssignmentTeacher || isAdmin ? `/teacher/assignments/${assignment.id}` : '/student'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {isAssignmentTeacher || isAdmin ? 'Assignment Submissions' : 'Dashboard'}</span>
          </Link>

          <div className="page-intro flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Cryptographic Evidence Dossier</p>
              <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{assignment.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-500">
                <span className="font-mono font-medium bg-ink-100/80 px-2 py-0.5 rounded text-ink-800">
                  {s.file_name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-ink-400" />
                  Submitted: {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'Pending'}
                </span>
              </div>
            </div>
            <StatusBadge status={s.status} />
          </div>
        </div>

        {/* State machine stepper */}
        <StateMachineStepper status={s.status} />

        <div className="space-y-6">
          {/* File Card */}
          <div>
            <SectionHeader icon={FileText} title="File Metadata & Storage" />
            <div className="card-padded surface-grid bg-white space-y-4">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">File Name</dt>
                  <dd className="mt-1 font-semibold text-ink-900 truncate" title={s.file_name}>{s.file_name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">Payload Size</dt>
                  <dd className="mt-1 font-semibold text-ink-900">{formatBytes(s.file_size)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">Timestamp</dt>
                  <dd className="mt-1 font-semibold text-ink-900">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                  </dd>
                </div>
              </dl>
              <div className="border-t border-ink-100 pt-3 flex items-center justify-between gap-4">
                <p className="text-xs text-ink-500">
                  {s.file_path ? 'Encrypted file stored in R2. Access gated via short-lived presigned links.' : 'File pending upload.'}
                </p>
                {canDownload && <DownloadButton submissionId={s.id} mimeType={s.mime_type} />}
              </div>
            </div>
          </div>

          {/* Fingerprint Card */}
          {s.file_hash && (
            <div>
              <SectionHeader icon={Hash} title="Cryptographic SHA-256 Fingerprint" />
              <div className="card-padded bg-white space-y-2">
                <p className="text-xs text-ink-500">
                  Server-side computed hash representing the exact binary byte sequence stored in R2.
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-xl border border-brand-100 bg-brand-50/40 px-3.5 py-2.5 font-mono text-xs font-semibold text-brand-900">
                    {s.file_hash}
                  </code>
                  <CopyButton value={s.file_hash} />
                </div>
              </div>
            </div>
          )}

          {/* Blockchain Proof */}
          {(s.blockchain_tx_hash || s.blockchain_block_number != null) && (
            <div>
              <SectionHeader icon={Cpu} title="Sepolia Blockchain Proof" />
              <div className="card-padded bg-white space-y-4">
                <p className="text-xs text-ink-500">
                  Write-once smart contract transaction confirming fingerprint registration.
                </p>
                <dl className="grid gap-3 text-sm">
                  {s.blockchain_tx_hash && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">Transaction Hash</dt>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs text-ink-800 border border-ink-200">
                          {s.blockchain_tx_hash}
                        </code>
                        <CopyButton value={s.blockchain_tx_hash} />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-6 pt-2 border-t border-ink-100">
                    {s.blockchain_block_number != null && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">Block Number</dt>
                        <dd className="mt-0.5 text-sm font-bold text-ink-900">{s.blockchain_block_number}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">Network</dt>
                      <dd className="mt-0.5 text-sm font-bold text-brand-700">Sepolia Testnet</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">State Machine</dt>
                      <dd className="mt-0.5">
                        <StatusBadge status={s.status} showIcon={false} />
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {canRetry && <RetryBlockchainButton submissionId={s.id} />}

          {/* Live Integrity Card */}
          {s.status === 'CONFIRMED' && (
            <div>
              <SectionHeader icon={ShieldCheck} title="Live Integrity Verification" />
              <VerifyIntegrityCard submissionId={s.id} />
            </div>
          )}

          {/* Evaluation Grade */}
          <div>
            <SectionHeader icon={Award} title="Instructor Grade & Feedback" />
            {canGrade ? (
              <GradeForm submissionId={s.id} existingGrade={(grade as Grade | null) ?? null} />
            ) : (
              <GradeDisplay grade={(grade as Grade | null) ?? null} />
            )}
          </div>

          {/* Similarity Scan */}
          {canGrade && (
            <div>
              <SectionHeader icon={GitBranch} title="Text Similarity Analysis" />
              <div className="card-padded bg-white">
                <SimilarityCard submissionId={s.id} />
              </div>
            </div>
          )}

          {/* Audit Timeline */}
          <div>
            <SectionHeader icon={History} title="Immutable Audit Trail" />
            <div className="card-padded bg-white">
              <AuditTimeline submissionId={s.id} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
