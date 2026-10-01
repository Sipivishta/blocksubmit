import React from 'react';
import type { SubmissionStatus } from '@/types';
import { 
  Upload, 
  Database, 
  Hash, 
  Cpu, 
  ShieldCheck, 
  AlertOctagon, 
  FileX, 
  Link2Off 
} from 'lucide-react';

const STATUS_CONFIG: Record<
  SubmissionStatus, 
  { label: string; icon: React.ComponentType<{ className?: string }>; text: string; bg: string; border: string; pulse?: boolean }
> = {
  UPLOADING: { 
    label: 'Uploading', 
    icon: Upload, 
    text: 'text-sky-700', 
    bg: 'bg-sky-50', 
    border: 'border-sky-200', 
    pulse: true 
  },
  STORED: { 
    label: 'File Stored', 
    icon: Database, 
    text: 'text-brand-700', 
    bg: 'bg-brand-50', 
    border: 'border-brand-200' 
  },
  HASHED: { 
    label: 'Fingerprinted', 
    icon: Hash, 
    text: 'text-purple-700', 
    bg: 'bg-purple-50', 
    border: 'border-purple-200' 
  },
  RECORDING: { 
    label: 'Recording On-Chain', 
    icon: Cpu, 
    text: 'text-amber-800', 
    bg: 'bg-amber-50', 
    border: 'border-amber-200',
    pulse: true
  },
  CONFIRMED: { 
    label: 'Confirmed On-Chain', 
    icon: ShieldCheck, 
    text: 'text-emerald-800', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200' 
  },
  UPLOAD_FAILED: { 
    label: 'Upload Failed', 
    icon: FileX, 
    text: 'text-red-700', 
    bg: 'bg-red-50', 
    border: 'border-red-200' 
  },
  HASH_FAILED: { 
    label: 'Hashing Failed', 
    icon: AlertOctagon, 
    text: 'text-red-700', 
    bg: 'bg-red-50', 
    border: 'border-red-200' 
  },
  BLOCKCHAIN_FAILED: {
    label: 'Recording Failed',
    icon: Link2Off,
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200'
  }
};

export function StatusBadge({ status, showIcon = true }: { status: SubmissionStatus; showIcon?: boolean }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    icon: ShieldCheck,
    text: 'text-ink-700',
    bg: 'bg-ink-100',
    border: 'border-ink-200'
  };

  const IconComponent = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm transition-all ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {showIcon && (
        <IconComponent className={`h-3.5 w-3.5 shrink-0 ${cfg.pulse ? 'animate-pulse' : ''}`} />
      )}
      <span>{cfg.label}</span>
    </span>
  );
}
