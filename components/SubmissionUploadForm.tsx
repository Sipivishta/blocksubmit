'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ArrowRight, Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useToast } from './ToastProvider';
import Link from 'next/link';
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
  const toast = useToast();

  function validateAndSetFile(selected: File | null) {
    setError(null);
    if (selected) {
      if (selected.size > MAX_SIZE_BYTES) {
        const msg = 'File exceeds the 20MB limit.';
        setError(msg);
        toast.error('File size error', msg);
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
        const msg = data.error ?? 'Submission failed';
        setError(msg);
        toast.error('Submission failed', msg);
        return;
      }
      setResult(data.submission);
      toast.success('File submitted successfully!', 'Fingerprint calculation and proof recording started.');
      router.refresh();
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Network error', 'Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-padded bg-white shadow-card border border-ink-200/80">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-ink-900">Upload your work</label>
            <span className="text-xs font-medium text-ink-500">Max file size: 20MB</span>
          </div>
          <p className="text-xs text-ink-500">Accepted formats: PDF, DOCX, PPTX, ZIP</p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`surface-grid relative mt-3 flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all ${
              dragActive
                ? 'border-brand-500 bg-brand-50/80 shadow-lift scale-[1.01]'
                : file
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/30'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.docx,.pptx,.zip"
              onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
              className="absolute inset-0 cursor-pointer opacity-0 z-10"
              aria-label="Choose a file to upload"
            />
            {file ? (
              <div className="flex items-center justify-between w-full max-w-md bg-white p-3 rounded-lg border border-emerald-200 shadow-sm z-20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold text-ink-900 truncate">{file.name}</p>
                    <p className="text-xs text-ink-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="p-1 rounded-md text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 pointer-events-none">
                <div className="p-3 rounded-2xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100">
                  <UploadCloud className="h-6 w-6 stroke-[1.8]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800">
                    <span className="text-brand-600 hover:underline">Click to browse</span> or drag & drop file
                  </p>
                  <p className="text-xs text-ink-400 mt-0.5">SHA-256 fingerprint will be recorded on submission</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {file && !result && (
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 shadow-sm active:scale-[0.99] transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Uploading & hashing file...</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                <span>Submit File for Verification</span>
              </>
            )}
          </button>
        )}

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="text-sm font-semibold text-emerald-900 truncate">{result.file_name}</span>
              </div>
              <StatusBadge status={result.status} />
            </div>
            <Link
              href={`/submissions/${result.id}`}
              className="btn-primary w-full py-2 text-xs bg-emerald-700 hover:bg-emerald-800 border-none shadow-sm"
            >
              <span>View Immutable Submission Proof</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
