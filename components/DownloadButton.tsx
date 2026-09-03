'use client';

// Calls the existing presigned-download endpoint and opens the returned
// short-lived URL. Never constructs or stores an R2 URL itself — every
// click gets a fresh URL, generated only after the backend's authorization
// check on GET /api/submissions/[id]/download.
import { useState } from 'react';

export function DownloadButton({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/download`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not generate a download link');
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleDownload} disabled={loading} className="btn-secondary">
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path d="M8 2v8m0 0 3-3M8 10 5 7M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {loading ? 'Generating link…' : 'Download file'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
