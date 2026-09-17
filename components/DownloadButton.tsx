'use client';

// Calls the existing presigned-download endpoint and opens the returned
// short-lived URL. Never constructs or stores an R2 URL itself — every
// click gets a fresh URL, generated only after the backend's authorization
// check on GET /api/submissions/[id]/download.
//
// Two distinct actions: "View document" requests mode=view (renders
// inline in a new tab for formats the browser can actually display —
// currently PDF only), "Download file" always requests a real download.
// Whether "View" is offered at all is driven by the server's own
// `viewable` response (based on the submission's server-detected
// mime_type), not guessed client-side from the filename.
import { useState } from 'react';

const INLINE_VIEWABLE_MIME_TYPES = new Set(['application/pdf']);

async function requestUrl(submissionId: string, mode: 'view' | 'download') {
  const qs = mode === 'view' ? '?mode=view' : '';
  const res = await fetch(`/api/submissions/${submissionId}/download${qs}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Could not generate a link');
  return data as { url: string };
}

export function DownloadButton({ submissionId, mimeType }: { submissionId: string; mimeType?: string }) {
  const [loading, setLoading] = useState<'view' | 'download' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canView = mimeType ? INLINE_VIEWABLE_MIME_TYPES.has(mimeType) : false;

  async function handle(mode: 'view' | 'download') {
    setLoading(mode);
    setError(null);
    try {
      const { url } = await requestUrl(submissionId, mode);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canView && (
          <button onClick={() => handle('view')} disabled={loading !== null} className="btn-secondary">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path
                d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            {loading === 'view' ? 'Opening…' : 'View document'}
          </button>
        )}
        <button onClick={() => handle('download')} disabled={loading !== null} className="btn-secondary">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M8 2v8m0 0 3-3M8 10 5 7M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {loading === 'download' ? 'Generating link…' : 'Download file'}
        </button>
      </div>
      {!canView && mimeType && (
        <p className="mt-1.5 text-xs text-ink-400">Browser preview is unavailable for this file type.</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
