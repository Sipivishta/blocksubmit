'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from './ToastProvider';

export function RetryBlockchainButton({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function handleRetry() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/retry`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? 'Retry failed';
        setError(msg);
        toast.error('Retry failed', msg);
        return;
      }
      toast.success('On-chain retry initiated', 'Attempting to re-record fingerprint on Sepolia.');
      router.refresh();
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Network error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-2.5 text-sm text-red-800">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Recording this submission on-chain failed. The file and SHA-256 fingerprint remain stored securely in R2.
          You can retry the blockchain recording step now.
        </p>
      </div>
      <button
        onClick={handleRetry}
        disabled={loading}
        className="btn-danger text-xs py-2 px-3 gap-1.5 shadow-sm active:scale-[0.98] transition-all"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Retrying On-Chain Step...</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Blockchain Recording</span>
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
    </div>
  );
}
