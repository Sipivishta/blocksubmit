'use client';

import { useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { useToast } from './ToastProvider';

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
  const toast = useToast();
  const canView = mimeType ? INLINE_VIEWABLE_MIME_TYPES.has(mimeType) : false;

  async function handle(mode: 'view' | 'download') {
    setLoading(mode);
    setError(null);
    try {
      const { url } = await requestUrl(submissionId, mode);
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.info(mode === 'view' ? 'Opening document preview...' : 'Generating secure download link...');
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Download error', msg);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canView && (
          <button
            onClick={() => handle('view')}
            disabled={loading !== null}
            className="btn-secondary py-2 px-3 text-xs gap-1.5 active:scale-[0.98] transition-all"
          >
            {loading === 'view' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-600" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-ink-600" />
            )}
            <span>{loading === 'view' ? 'Opening...' : 'View Document'}</span>
          </button>
        )}
        <button
          onClick={() => handle('download')}
          disabled={loading !== null}
          className="btn-secondary py-2 px-3 text-xs gap-1.5 active:scale-[0.98] transition-all"
        >
          {loading === 'download' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
          ) : (
            <Download className="h-3.5 w-3.5 text-brand-600" />
          )}
          <span>{loading === 'download' ? 'Generating...' : 'Download File'}</span>
        </button>
      </div>
      {!canView && mimeType && (
        <p className="mt-1 text-[11px] text-ink-400">Inline browser view not supported for this file type.</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
