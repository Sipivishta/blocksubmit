'use client';

// The "Verify Integrity" result card: fires POST /api/submissions/[id]/verify
// and renders a clear VERIFIED/TAMPERED result. Same single request/response
// cycle as before — the "VERIFYING" state below reflects that one request
// being in flight, not a fabricated multi-step progress sequence.
import { useState } from 'react';
import { CopyButton } from './CopyButton';
import type { VerificationResult } from '@/types';

function truncateHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : hash;
}

export function VerifyIntegrityCard({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Verification failed');
        return;
      }
      setResult(data);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <div className="card-padded">
        <button onClick={handleVerify} disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Verifying…
            </>
          ) : (
            'Verify Integrity'
          )}
        </button>
        {error && <p role="alert" aria-live="polite" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  const isVerified = result.verified;
  const hashesMatch = result.currentHash === result.onChainHash;

  return (
    <div
      className={`animate-fade-slide-in rounded-lg border p-5 sm:p-6 ${
        isVerified ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            isVerified ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {isVerified ? '✓' : '✕'}
        </span>
        <span>
          <span className={`block text-base font-semibold ${isVerified ? 'text-emerald-800' : 'text-red-800'}`}>
            {isVerified ? 'Integrity verified' : 'Integrity mismatch'}
          </span>
          <span className={`text-xs ${isVerified ? 'text-emerald-700' : 'text-red-700'}`}>{isVerified ? 'Cryptographic proof matches' : 'The file differs from its proof'}</span>
        </span>
      </div>
      <p className={`mt-2 text-sm ${isVerified ? 'text-emerald-700' : 'text-red-700'}`}>
        {isVerified
          ? 'File integrity confirmed. The current file matches the SHA-256 fingerprint recorded on-chain.'
          : 'The current file does NOT match the immutable fingerprint recorded on-chain at submission time.'}
      </p>

      <div className="mt-4 space-y-2 rounded-md border border-ink-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Current hash</p>
            <p className="truncate font-mono text-xs text-ink-700" title={result.currentHash}>
              {truncateHash(result.currentHash)}
            </p>
          </div>
          <CopyButton value={result.currentHash} />
        </div>
        <div className={`flex items-center justify-center gap-2 text-xs font-medium ${hashesMatch ? 'text-emerald-600' : 'text-red-600'}`}>
          <div className="h-px flex-1 bg-current opacity-20" />
          {hashesMatch ? '= matches' : '≠ does not match'}
          <div className="h-px flex-1 bg-current opacity-20" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">On-chain hash</p>
            <p className="truncate font-mono text-xs text-ink-700" title={result.onChainHash}>
              {truncateHash(result.onChainHash)}
            </p>
          </div>
          <CopyButton value={result.onChainHash} />
        </div>
      </div>

      {result.transactionHash && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-500">
          <span className="truncate font-mono" title={result.transactionHash}>
            {truncateHash(result.transactionHash)}
          </span>
          {result.explorerUrl && (
            <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-brand-600 hover:underline">
              View on explorer →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
