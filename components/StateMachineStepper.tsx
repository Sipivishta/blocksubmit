// Visual progress through the submission pipeline:
//   UPLOADING -> STORED -> HASHED -> RECORDING -> CONFIRMED
// with a distinct failure explanation for UPLOAD_FAILED / HASH_FAILED /
// BLOCKCHAIN_FAILED, since those aren't points on the happy path — they're
// dead ends off of it (except BLOCKCHAIN_FAILED, which can resume via retry).
import type { SubmissionStatus } from '@/types';

const STEPS: { status: SubmissionStatus; label: string }[] = [
  { status: 'UPLOADING', label: 'Uploading' },
  { status: 'STORED', label: 'Stored' },
  { status: 'HASHED', label: 'Hashed' },
  { status: 'RECORDING', label: 'Recording' },
  { status: 'CONFIRMED', label: 'Confirmed' }
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">{status.replace('_', ' ')}</p>
        <p className="mt-1 text-sm text-red-700">{failureExplanation}</p>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="card-padded surface-grid" role="progressbar" aria-label={`Submission status: ${status}`}>
      <div className="flex min-w-[560px] items-center">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                      ? 'bg-ink-900 text-white'
                      : 'bg-ink-100 text-ink-400'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`mt-1 whitespace-nowrap text-xs ${isCurrent ? 'font-medium text-ink-900' : 'text-ink-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 transition-colors ${isDone ? 'bg-emerald-600' : 'bg-ink-200'}`} />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
