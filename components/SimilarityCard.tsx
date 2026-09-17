'use client';

// Teacher/admin-only panel on the submission details page. Fetches from
// the existing GET /api/submissions/[id]/similarity route, which is
// itself the authorization boundary (students get 403 there regardless
// of whether this component is ever rendered for them — this component
// is an extra UI-layer precaution, not the real boundary).
import { useEffect, useState } from 'react';

interface Match {
  score: number;
  evidence: string[];
  otherSubmissionId: string;
  otherStudentName: string;
}

function scoreStyle(score: number): { label: string; className: string } {
  if (score >= 70) return { label: 'High similarity', className: 'border-red-200 bg-red-50 text-red-700' };
  if (score >= 40) return { label: 'Possible match', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  return { label: 'Low similarity', className: 'border-ink-200 bg-ink-50 text-ink-600' };
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

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!matches) return <p className="text-sm text-ink-400">Loading…</p>;
  if (matches.length === 0) {
    return <p className="text-sm text-ink-400">No similar submissions detected for this assignment.</p>;
  }

  return (
    <div className="space-y-3">
      {matches.map((m) => {
        const style = scoreStyle(m.score);
        return (
          <div key={m.otherSubmissionId} className={`rounded-lg border p-4 ${style.className}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{style.label}</span>
              <span className="text-sm font-semibold">{m.score}%</span>
            </div>
            <p className="mt-1 text-xs opacity-80">Potential match: {m.otherStudentName}</p>
            {m.evidence.length > 0 && (
              <div className="mt-2 space-y-1">
                {m.evidence.slice(0, 3).map((phrase, i) => (
                  <p key={i} className="truncate rounded bg-white/60 px-2 py-1 font-mono text-xs">
                    &quot;{phrase}&quot;
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-ink-400">
        This is an automated similarity signal, not a determination of academic misconduct. Review the
        evidence and make the final judgment yourself.
      </p>
    </div>
  );
}
