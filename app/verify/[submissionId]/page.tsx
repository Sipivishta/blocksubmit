// Public verification page: /verify/[submissionId]
// Shows only the integrity proof (status + hash + tx + explorer link) —
// never the file itself, never an R2 URL, never any student-identifying
// field, and no auth required, since the point is that anyone (e.g. an
// external reviewer) can independently confirm a submission's fingerprint
// without needing an account. Recomputes the hash from R2 server-side to
// show a real VERIFIED/TAMPERED result, exactly like the authenticated
// /api/submissions/[id]/verify route — it just never returns the bytes
// used to compute it.
export const runtime = 'nodejs';

import { createServiceRoleClient } from '@/lib/supabase-server';
import { getOnChainRecord, explorerTxUrl } from '@/lib/blockchain';
import { fetchFromR2 } from '@/lib/r2';
import { sha256Hex } from '@/lib/hash';
import { PublicHeader } from '@/components/PublicHeader';
import { CopyButton } from '@/components/CopyButton';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function NoticePage({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        <p className="mt-2 text-sm text-ink-600">{detail}</p>
      </main>
    </>
  );
}

export default async function PublicVerifyPage({
  params
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  if (!UUID_RE.test(submissionId)) {
    return <NoticePage title="Invalid submission ID" detail="This does not look like a valid submission ID." />;
  }

  // Service role is required here only because this page is intentionally
  // public (no session to carry RLS) — the select below is scoped to
  // exactly the safe, non-identifying columns proof requires, which is
  // what actually keeps this safe, not the client used to fetch them.
  const supabase = createServiceRoleClient();
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, status, file_path, blockchain_tx_hash, blockchain_block_number, submitted_at')
    .eq('id', submissionId)
    .maybeSingle();

  if (!submission) {
    return <NoticePage title="Submission not found" detail="No submission exists with this ID." />;
  }
  if (submission.status !== 'CONFIRMED') {
    return (
      <NoticePage
        title="Not yet confirmed on-chain"
        detail={`This submission's current status is ${submission.status}.`}
      />
    );
  }

  let onChain: Awaited<ReturnType<typeof getOnChainRecord>> = null;
  let currentHash: string | null = null;
  let dependencyError = false;
  try {
    const [chainRecord, fileBytes] = await Promise.all([
      getOnChainRecord(submission.id),
      fetchFromR2(submission.file_path)
    ]);
    onChain = chainRecord;
    currentHash = sha256Hex(fileBytes);
  } catch (err) {
    console.error('Public verify: dependency failure', err);
    dependencyError = true;
  }

  if (dependencyError) {
    return (
      <NoticePage
        title="Verification temporarily unavailable"
        detail="Could not reach storage or the blockchain network to confirm this record. Please try again shortly."
      />
    );
  }
  if (!onChain) {
    return (
      <NoticePage
        title="On-chain record not found"
        detail="This submission is marked confirmed but no matching blockchain record exists — this indicates a data inconsistency, not a tampered file."
      />
    );
  }

  const verified = currentHash === onChain.fileHashHex;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-semibold text-ink-900">BlockSubmit — Integrity Verification</h1>
        <p className="mt-1 text-sm text-ink-400">Submission ID: {submission.id}</p>

        <div
          className={`mt-4 rounded-lg border p-4 ${
            verified ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
          }`}
        >
          <span className={`text-lg font-semibold ${verified ? 'text-emerald-700' : 'text-red-700'}`}>
            {verified ? '✓ VERIFIED' : '✗ TAMPERED'}
          </span>
          <p className="mt-1 text-sm text-ink-600">
            {verified
              ? 'The file matches the fingerprint recorded on-chain.'
              : 'The current file does NOT match the immutable blockchain fingerprint.'}
          </p>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-ink-700">File fingerprint (SHA-256)</dt>
            <div className="mt-0.5 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-ink-50 px-2 py-1.5 font-mono text-xs text-ink-700">
                {onChain.fileHashHex}
              </code>
              <CopyButton value={onChain.fileHashHex} />
            </div>
          </div>
          <div>
            <dt className="font-medium text-ink-700">Submitted at</dt>
            <dd className="text-ink-600">{submission.submitted_at}</dd>
          </div>
          {submission.blockchain_tx_hash && (
            <div>
              <dt className="font-medium text-ink-700">Blockchain transaction</dt>
              <div className="mt-0.5 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-ink-50 px-2 py-1.5 font-mono text-xs text-ink-700">
                  {submission.blockchain_tx_hash}
                </code>
                <CopyButton value={submission.blockchain_tx_hash} />
              </div>
            </div>
          )}
          {submission.blockchain_block_number != null && (
            <div>
              <dt className="font-medium text-ink-700">Block</dt>
              <dd className="text-ink-600">{submission.blockchain_block_number}</dd>
            </div>
          )}
        </dl>

        {submission.blockchain_tx_hash && (
          <a
            href={explorerTxUrl(submission.blockchain_tx_hash)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-ink-900 underline"
          >
            View on Sepolia Explorer →
          </a>
        )}

        <p className="mt-6 text-xs text-ink-300">
          This page shows only the recorded fingerprint and blockchain proof. It never exposes the
          submitted file, a download link, student identity, or any account information.
        </p>
      </main>
    </>
  );
}
