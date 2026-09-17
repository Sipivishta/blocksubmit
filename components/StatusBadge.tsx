// Visual indicator for a submission's position in the state machine:
// UPLOADING -> STORED -> HASHED -> RECORDING -> CONFIRMED
// with distinct failure states shown in red + a short explanation.
import type { SubmissionStatus } from '@/types';

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; symbol: string; dot: string; text: string; bg: string }> = {
  UPLOADING: { label: 'Uploading', symbol: '...', dot: 'bg-status-uploading', text: 'text-ink-600', bg: 'bg-ink-100' },
  STORED: { label: 'File stored', symbol: 'S', dot: 'bg-status-stored', text: 'text-brand-700', bg: 'bg-brand-50' },
  HASHED: { label: 'Hashed', symbol: '#', dot: 'bg-status-hashed', text: 'text-violet-700', bg: 'bg-violet-50' },
  RECORDING: { label: 'Recording on-chain', symbol: 'R', dot: 'bg-status-recording', text: 'text-amber-700', bg: 'bg-amber-50' },
  CONFIRMED: { label: 'Confirmed', symbol: '✓', dot: 'bg-status-confirmed', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  UPLOAD_FAILED: { label: 'Upload failed', symbol: '!', dot: 'bg-status-failed', text: 'text-red-700', bg: 'bg-red-50' },
  HASH_FAILED: { label: 'Hashing failed', symbol: '!', dot: 'bg-status-failed', text: 'text-red-700', bg: 'bg-red-50' },
  BLOCKCHAIN_FAILED: {
    label: 'On-chain recording failed',
    symbol: '!',
    dot: 'bg-status-failed',
    text: 'text-red-700',
    bg: 'bg-red-50'
  }
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${cfg.dot}`}>{cfg.symbol}</span>
      {cfg.label}
    </span>
  );
}
