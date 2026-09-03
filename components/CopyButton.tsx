'use client';

// Small copy-to-clipboard affordance, used for the SHA-256 fingerprint
// and transaction hash on the submission page. Purely presentational —
// copies whatever string it's given, no data of its own.
import { useState } from 'react';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — fail silently,
      // the value is still visible and selectable on the page.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded border border-ink-200 px-2 py-1 text-xs font-medium text-ink-600 hover:bg-ink-50"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-emerald-600">
            <path d="M3 8.5 6.2 12 13 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        label
      )}
    </button>
  );
}
