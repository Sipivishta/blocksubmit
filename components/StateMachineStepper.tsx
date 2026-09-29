import React from 'react';
import type { SubmissionStatus } from '@/types';
import { Check, AlertTriangle, Upload, Database, Hash, Cpu, ShieldCheck } from 'lucide-react';

const STEPS: { status: SubmissionStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { status: 'UPLOADING', label: 'Upload', icon: Upload },
  { status: 'STORED', label: 'Store', icon: Database },
  { status: 'HASHED', label: 'Hash', icon: Hash },
  { status: 'RECORDING', label: 'Record', icon: Cpu },
  { status: 'CONFIRMED', label: 'Confirmed', icon: ShieldCheck }
];

const FAILURE_EXPLANATIONS: Partial<Record<SubmissionStatus, string>> = {
  UPLOAD_FAILED: 'The file could not be saved to storage. No hash or blockchain record was created.',
  HASH_FAILED: 'The file was stored, but computing its fingerprint failed. It was never sent to the blockchain.',
  BLOCKCHAIN_FAILED:
    'The file was stored and hashed successfully — only recording the fingerprint on-chain failed. This step can be retried without re-uploading.'
};

export function StateMachineStepper({ status }: { status: SubmissionStatus }) {
  const failureExplanation = FAILURE_EXPLANATIONS[status];
  if (failureExplanation) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 shadow-sm flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-900">{status.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-xs leading-relaxed text-red-700">{failureExplanation}</p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="card-padded surface-grid overflow-x-auto" role="progressbar" aria-label={`Submission status: ${status}`}>
      <div className="flex min-w-[500px] items-center justify-between py-2">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.status}>
              <div className="flex flex-col items-center group">
                <div
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-brand-600 text-white shadow-lift ring-4 ring-brand-100'
                      : 'bg-ink-100 text-ink-400 border border-ink-200'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <StepIcon className={`h-4 w-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs tracking-tight ${
                    isCurrent
                      ? 'font-bold text-ink-900'
                      : isDone
                      ? 'font-semibold text-emerald-800'
                      : 'font-medium text-ink-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className={`mx-3 h-1 flex-1 rounded-full transition-all ${
                    i < currentIndex ? 'bg-emerald-500' : 'bg-ink-200/80'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
