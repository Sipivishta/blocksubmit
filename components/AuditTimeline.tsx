'use client';

// Fetches from the existing GET /api/submissions/[id]/timeline route and
// renders the audit trail as a vertical timeline. The route itself is the
// authorization boundary (see that file); this component just displays
// whatever it's allowed to see — same data, same fields, just presented
// with an icon per action and a subtle fade-in as each event renders.
import { useEffect, useState } from 'react';

interface TimelineEvent {
  action: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

const ACTION_INFO: Record<string, { label: string; icon: string }> = {
  SUBMISSION_CREATED: { label: 'Submission created', icon: '●' },
  FILE_UPLOADED: { label: 'File stored', icon: '▣' },
  HASH_CREATED: { label: 'SHA-256 generated', icon: '#' },
  BLOCKCHAIN_RECORDED: { label: 'Blockchain record created', icon: '◆' },
  BLOCKCHAIN_RETRY: { label: 'Blockchain recording retried', icon: '↻' },
  VERIFICATION_REQUESTED: { label: 'Integrity verified', icon: '✓' },
  FILE_ACCESSED: { label: 'File downloaded', icon: '↓' },
  GRADE_CREATED: { label: 'Graded', icon: '★' },
  GRADE_UPDATED: { label: 'Grade updated', icon: '★' }
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

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!events) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 animate-pulse rounded-full bg-ink-100" />
            <div className="h-3 w-40 animate-pulse rounded bg-ink-100" />
          </div>
        ))}
      </div>
    );
  }
  if (events.length === 0) return <p className="text-sm text-ink-400">No events recorded yet.</p>;

  return (
    <ol className="space-y-4 border-l border-ink-200 pl-5">
      {events.map((event, i) => {
        const info = ACTION_INFO[event.action] ?? { label: event.action, icon: '•' };
        return (
          <li key={i} className="relative animate-fade-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
            <span className="absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-ink-200 bg-white text-[10px] text-ink-500">
              {info.icon}
            </span>
            <p className="text-sm font-medium text-ink-800">{info.label}</p>
            <p className="text-xs text-ink-400">{new Date(event.created_at).toLocaleString()}</p>
          </li>
        );
      })}
    </ol>
  );
}
