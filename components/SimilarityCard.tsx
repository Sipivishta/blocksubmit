'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Info, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';

interface Match {
  score: number;
  evidence: string[];
  otherSubmissionId: string;
  otherStudentName: string;
}

function scoreStyle(score: number): { label: string; bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> } {
  if (score >= 70) return { label: 'High Similarity Risk', bg: 'bg-red-50/80', border: 'border-red-200', text: 'text-red-900', icon: ShieldAlert };
  if (score >= 40) return { label: 'Moderate Similarity', bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-900', icon: AlertTriangle };
  return { label: 'Low Similarity', bg: 'bg-ink-50/80', border: 'border-ink-200', text: 'text-ink-800', icon: Info };
}

export function SimilarityCard({ submissionId }: { submissionId: string }) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/submissions/${submissionId}/similarity`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        setMatches(data.matches);
      })
      .catch(() => !cancelled && setError('Could not load similarity results'));
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (error) return <p className="text-sm text-red-600 font-medium">{error}</p>;
  if (!matches) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-500 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        <span>Scanning text extraction pipeline for similarity matches...</span>
      </div>
    );
  }
  if (matches.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>No significant content similarity detected across enrolled peer submissions.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((m) => {
        const style = scoreStyle(m.score);
        const Icon = style.icon;

        return (
          <div key={m.otherSubmissionId} className={`rounded-xl border p-4 shadow-sm ${style.bg} ${style.border}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-current" />
                <span className={`text-sm font-bold ${style.text}`}>{style.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-black/10 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.score >= 70 ? 'bg-red-600' : m.score >= 40 ? 'bg-amber-500' : 'bg-brand-500'}`}
                    style={{ width: `${m.score}%` }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums text-ink-900">{m.score}%</span>
              </div>
            </div>

            <p className="mt-2 text-xs text-ink-700">
              Matched with peer: <span className="font-semibold text-ink-900">{m.otherStudentName}</span>
            </p>

            {m.evidence.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Sample Extract Evidence</p>
                {m.evidence.slice(0, 3).map((phrase, i) => (
                  <div key={i} className="truncate rounded-md border border-ink-200/60 bg-white/90 px-2.5 py-1.5 font-mono text-xs text-ink-800 shadow-sm">
                    &quot;{phrase}&quot;
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-ink-400 leading-relaxed">
        This automated metric is an assistance tool. Final integrity determination remains subject to academic review.
      </p>
    </div>
  );
}
