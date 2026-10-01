'use client';

import { useState } from 'react';
import { CopyButton } from './CopyButton';
import { ShieldCheck, ShieldAlert, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from './ToastProvider';
import type { VerificationResult } from '@/types';

function truncateHash(hash: string): string {
  return hash.length > 24 ? `${hash.slice(0, 12)}…${hash.slice(-10)}` : hash;
}

export function VerifyIntegrityCard({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? 'Verification failed';
        setError(msg);
        toast.error('Verification error', msg);
        return;
      }
      setResult(data);
      if (data.verified) {
        toast.success('Integrity Verified!', 'File matches the recorded SHA-256 on-chain fingerprint.');
      } else {
        toast.error('Integrity Mismatch!', 'The stored file hash does not match the blockchain fingerprint.');
      }
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Network error', 'Failed to reach verification endpoint');
    } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <div className="card-padded bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Live Blockchain Verification</p>
            <p className="text-xs text-ink-500 mt-0.5">Re-fetch current file bytes, recompute SHA-256, and compare against Sepolia on-chain record.</p>
          </div>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="btn-primary py-2 px-4 shadow-sm shrink-0 active:scale-[0.98] transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Verifying Proof...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Verify Integrity</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <p role="alert" aria-live="polite" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  const isVerified = result.verified;
  const hashesMatch = result.currentHash === result.onChainHash;

  return (
    <div
      className={`animate-fade-slide-in rounded-2xl border p-5 sm:p-6 shadow-sm transition-all ${
        isVerified ? 'border-emerald-200 bg-emerald-50/70' : 'border-red-200 bg-red-50/70'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
              isVerified ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {isVerified ? <ShieldCheck className="h-6 w-6 stroke-[2]" /> : <ShieldAlert className="h-6 w-6 stroke-[2]" />}
          </div>
          <div>
            <h3 className={`text-base font-bold tracking-tight ${isVerified ? 'text-emerald-900' : 'text-red-900'}`}>
              {isVerified ? 'Integrity Verified' : 'Integrity Mismatch Detected'}
            </h3>
            <p className={`text-xs font-medium ${isVerified ? 'text-emerald-700' : 'text-red-700'}`}>
              {isVerified ? 'Cryptographic proof verified against Sepolia contract' : 'Stored bytes do not match on-chain fingerprint'}
            </p>
          </div>
        </div>
        <button
          onClick={handleVerify}
          disabled={loading}
          className="btn-secondary py-1.5 px-3 text-xs gap-1 hover:bg-white shrink-0"
          title="Re-run verification"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-verify</span>
        </button>
      </div>

      <p className={`mt-3 text-xs leading-relaxed ${isVerified ? 'text-emerald-800' : 'text-red-800'}`}>
        {isVerified
          ? 'File integrity confirmed. The file in storage matches the immutable SHA-256 hash written to the Sepolia blockchain.'
          : 'Warning: The current file in storage has a different hash than the fingerprint recorded when the submission was sealed.'}
      </p>

      <div className="mt-4 space-y-3 rounded-xl border border-ink-200/80 bg-white p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Current Computed Hash</p>
            <p className="truncate font-mono text-xs font-medium text-ink-800 mt-0.5" title={result.currentHash}>
              {truncateHash(result.currentHash)}
            </p>
          </div>
          <CopyButton value={result.currentHash} />
        </div>

        <div className={`flex items-center justify-center gap-2 text-xs font-bold ${hashesMatch ? 'text-emerald-600' : 'text-red-600'}`}>
          <div className="h-px flex-1 bg-ink-200" />
          <span className="rounded-full px-2.5 py-0.5 bg-ink-50 border border-ink-200 text-[11px]">
            {hashesMatch ? '= SHA-256 HASHEVENT MATCH' : '≠ FINGERPRINT MISMATCH'}
          </span>
          <div className="h-px flex-1 bg-ink-200" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">On-Chain Fingerprint</p>
            <p className="truncate font-mono text-xs font-medium text-ink-800 mt-0.5" title={result.onChainHash}>
              {truncateHash(result.onChainHash)}
            </p>
          </div>
          <CopyButton value={result.onChainHash} />
        </div>
      </div>

      {result.transactionHash && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-500">
          <span className="truncate font-mono" title={result.transactionHash}>
            Tx: {truncateHash(result.transactionHash)}
          </span>
          {result.explorerUrl && (
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              <span>View on Explorer</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
