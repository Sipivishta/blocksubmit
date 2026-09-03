'use client';

// Student-facing upload form driving the create-submission API call and
// reflecting each state-machine step back to the user as it happens.
// Drag-and-drop is a UI convenience over the same <input type="file">
// selection path — both end up calling the identical validate+setFile
// logic, and the actual submit is still the one real POST request it
// always was (no fabricated multi-step progress: "Submitting…" reflects
// that one request being in flight, and the badge shown afterward is the
// real final status the server returned).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from './StatusBadge';
import type { Submission } from '@/types';

const MAX_SIZE_BYTES = 20 * 1024 * 1024;
function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmissionUploadForm({ assignmentId }: { assignmentId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function validateAndSetFile(selected: File | null) {
    setError(null);
    if (selected) {
      if (selected.size > MAX_SIZE_BYTES) {
        setError('File exceeds the 20MB limit.');
        setFile(null);
        return;
      }
    }
    setFile(selected);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignmentId', assignmentId);

    try {
      const res = await fetch('/api/submissions', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Submission failed');
        return;
      }
      setResult(data.submission);
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-padded space-y-4">
      <div>
        <label className="text-sm font-semibold text-ink-900">Upload your file</label>
        <p className="mt-0.5 text-xs text-ink-400">PDF, DOCX, PPTX, or ZIP — up to 20MB</p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`surface-grid relative mt-3 flex min-h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all ${
            dragActive ? 'border-brand-400 bg-brand-50 shadow-lift' : file ? 'border-emerald-300 bg-emerald-50/40' : 'border-ink-200 hover:border-brand-300 hover:bg-brand-50/40'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.pptx,.zip"
            onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Choose a file to upload"
          />
          {file ? (
            <>
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-brand-600">
                <path d="M4 3h8l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <p className="mt-2 text-sm font-medium text-ink-800">{file.name}</p>
              <p className="text-xs text-ink-400">{formatBytes(file.size)}</p>
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-ink-300">
                <path d="M10 3v10m0-10 3.5 3.5M10 3 6.5 6.5M4 14v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm font-medium text-ink-600">Drag a file here, or click to browse</p>
            </>
          )}
        </div>
      </div>

      <button type="submit" disabled={!file || submitting} className="btn-primary">
        {submitting && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
        {submitting ? 'Submitting…' : 'Submit'}
      </button>

      {error && <p role="alert" aria-live="polite" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {result && (
        <div aria-live="polite" className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <span className="text-sm text-ink-700">{result.file_name}</span>
          <StatusBadge status={result.status} />
        </div>
      )}
    </form>
  );
}
