'use client';

// Shown only for a submission stuck in BLOCKCHAIN_FAILED (or a crashed
// RECORDING) — calls the existing PATCH /api/submissions/[id]/retry route.
// Server-side authorization and eligibility checks are authoritative; this
// button only appears when the page's own authorization check already
// passed (see app/submissions/[id]/page.tsx).
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RetryBlockchainButton({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRetry() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/retry`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Retry failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/60 p-4">
      <p className="text-sm text-red-700">
        Recording this submission on-chain failed. The file and its hash are safely stored — you can retry
        the blockchain step.
      </p>
      <button onClick={handleRetry} disabled={loading} className="btn-danger mt-3">
        {loading ? 'Retrying…' : 'Retry blockchain recording'}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
