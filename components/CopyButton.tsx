'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from './ToastProvider';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95 ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
      }`}
      title="Copy value"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 shrink-0 text-ink-400 group-hover:text-brand-600" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
