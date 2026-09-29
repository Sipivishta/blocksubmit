'use client';

import { useEffect, useState } from 'react';
import { 
  FilePlus, 
  Database, 
  Hash, 
  Cpu, 
  RefreshCw, 
  ShieldCheck, 
  Download, 
  Award, 
  Edit3, 
  Circle 
} from 'lucide-react';

interface TimelineEvent {
  action: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

const ACTION_INFO: Record<
  string, 
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  SUBMISSION_CREATED: { label: 'Submission Created', icon: FilePlus, color: 'text-brand-600 bg-brand-50 border-brand-200' },
  FILE_UPLOADED: { label: 'File Stored in R2', icon: Database, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  HASH_CREATED: { label: 'SHA-256 Fingerprint Generated', icon: Hash, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  BLOCKCHAIN_RECORDED: { label: 'Anchored to Sepolia Blockchain', icon: Cpu, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  BLOCKCHAIN_RETRY: { label: 'On-Chain Retry Triggered', icon: RefreshCw, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  VERIFICATION_REQUESTED: { label: 'Integrity Verified Live', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  FILE_ACCESSED: { label: 'Presigned Download Issued', icon: Download, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  GRADE_CREATED: { label: 'Submission Graded', icon: Award, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  GRADE_UPDATED: { label: 'Grade Record Updated', icon: Edit3, color: 'text-violet-600 bg-violet-50 border-violet-200' }
};

export function AuditTimeline({ submissionId }: { submissionId: string }) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/submissions/${submissionId}/timeline`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        setEvents(data.events);
      })
      .catch(() => !cancelled && setError('Could not load the audit trail'));
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (error) return <p className="text-sm text-red-600 font-medium">{error}</p>;
  if (!events) {
    return (
      <div className="space-y-4 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-7 w-7 animate-pulse rounded-full bg-ink-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-ink-100" />
          </div>
        ))}
      </div>
    );
  }
  if (events.length === 0) return <p className="text-sm text-ink-400">No events recorded yet.</p>;

  return (
    <ol className="relative space-y-6 border-l-2 border-ink-200 ml-3 pl-6 my-2">
      {events.map((event, i) => {
        const info = ACTION_INFO[event.action] ?? { label: event.action, icon: Circle, color: 'text-ink-600 bg-ink-50 border-ink-200' };
        const Icon = info.icon;

        return (
          <li key={i} className="relative animate-fade-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
            <span className={`absolute -left-[37px] top-0 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ${info.color}`}>
              <Icon className="h-3.5 w-3.5 stroke-[2]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900 leading-none">{info.label}</p>
              <p className="mt-1 text-xs text-ink-500">{new Date(event.created_at).toLocaleString()}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
