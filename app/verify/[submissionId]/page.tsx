export const runtime = 'nodejs';

import { createServiceRoleClient } from '@/lib/supabase-server';
import { getOnChainRecord, explorerTxUrl } from '@/lib/blockchain';
import { fetchFromR2 } from '@/lib/r2';
import { sha256Hex } from '@/lib/hash';
import { PublicHeader } from '@/components/PublicHeader';
import { CopyButton } from '@/components/CopyButton';
import { ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, Hash, Clock, Cpu, Lock } from 'lucide-react';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function NoticePage({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="card-padded max-w-md w-full bg-white text-center space-y-3 shadow-popover">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <AlertTriangle className="h-6 w-6 stroke-[2]" />
          </div>
          <h1 className="text-lg font-bold text-ink-950">{title}</h1>
          <p className="text-xs text-ink-600 leading-relaxed">{detail}</p>
        </div>
      </main>
    </div>
  );
}

export default async function PublicVerifyPage({
  params
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  if (!UUID_RE.test(submissionId)) {
    return <NoticePage title="Invalid Submission ID" detail="The provided ID does not match standard UUID format." />;
  }

  const supabase = createServiceRoleClient();
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, status, file_path, blockchain_tx_hash, blockchain_block_number, submitted_at')
    .eq('id', submissionId)
    .maybeSingle();

  if (!submission) {
    return <NoticePage title="Submission Not Found" detail="No recorded submission exists for this identifier." />;
  }
  if (submission.status !== 'CONFIRMED') {
    return (
      <NoticePage
        title="Pending Blockchain Confirmation"
        detail={`This submission is currently processing (${submission.status}). Verification will be available once confirmed on-chain.`}
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
        title="Verification Service Temporarily Unavailable"
        detail="Unable to reach storage or blockchain network. Please retry shortly."
      />
    );
  }
  if (!onChain) {
    return (
      <NoticePage
        title="On-Chain Record Discrepancy"
        detail="Submission status is confirmed, but no matching smart contract transaction was found."
      />
    );
  }

  const verified = currentHash === onChain.fileHashHex;

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <PublicHeader />

      <main className="flex-1 mx-auto max-w-xl w-full px-4 py-10 sm:py-16 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-100 mb-2">
            <Lock className="h-3.5 w-3.5" />
            <span>Independent Verification Ledger</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">
            Integrity Verification Proof
          </h1>
          <p className="text-xs text-ink-500 font-mono">Submission ID: {submission.id}</p>
        </div>

        {/* Verified Status Card */}
        <div
          className={`rounded-2xl border p-6 shadow-sm transition-all text-center space-y-3 ${
            verified ? 'border-emerald-200 bg-emerald-50/80' : 'border-red-200 bg-red-50/80'
          }`}
        >
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lift ${
              verified ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {verified ? <ShieldCheck className="h-8 w-8 stroke-[2]" /> : <ShieldAlert className="h-8 w-8 stroke-[2]" />}
          </div>

          <div>
            <h2 className={`text-xl font-bold ${verified ? 'text-emerald-950' : 'text-red-950'}`}>
              {verified ? '✓ VERIFIED INTEGRITY MATCH' : '✕ TAMPERED FILE DETECTED'}
            </h2>
            <p className={`mt-1 text-xs font-semibold ${verified ? 'text-emerald-800' : 'text-red-800'}`}>
              {verified
                ? 'Current file in storage matches exact SHA-256 fingerprint recorded on Sepolia blockchain.'
                : 'Warning: Stored file bytes differ from the immutable on-chain record.'}
            </p>
          </div>
        </div>

        {/* Proof Details */}
        <div className="card-padded bg-white space-y-4 shadow-card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400 border-b border-ink-100 pb-2">
            Cryptographic Audit Details
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-700 mb-1">
                <Hash className="h-3.5 w-3.5 text-brand-600" />
                <span>On-Chain SHA-256 Fingerprint</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-xl border border-brand-100 bg-brand-50/50 p-2.5 font-mono text-xs font-semibold text-brand-900">
                  {onChain.fileHashHex}
                </code>
                <CopyButton value={onChain.fileHashHex} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-ink-100 text-xs">
              <div>
                <div className="flex items-center gap-1 text-ink-400 font-semibold mb-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Submitted At</span>
                </div>
                <p className="font-semibold text-ink-800">{new Date(submission.submitted_at).toLocaleString()}</p>
              </div>

              {submission.blockchain_block_number != null && (
                <div>
                  <div className="flex items-center gap-1 text-ink-400 font-semibold mb-0.5">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Block Number</span>
                  </div>
                  <p className="font-semibold text-ink-800">{submission.blockchain_block_number}</p>
                </div>
              )}
            </div>

            {submission.blockchain_tx_hash && (
              <div className="pt-2 border-t border-ink-100 space-y-1.5">
                <span className="text-xs font-semibold text-ink-700">Sepolia Transaction Hash</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-ink-50 px-2.5 py-1.5 font-mono text-xs text-ink-800 border border-ink-200">
                    {submission.blockchain_tx_hash}
                  </code>
                  <CopyButton value={submission.blockchain_tx_hash} />
                </div>
                <a
                  href={explorerTxUrl(submission.blockchain_tx_hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline pt-1"
                >
                  <span>View Contract Execution on Sepolia Explorer</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-400 leading-relaxed px-4">
          This public verification page displays only immutable cryptographic proofs. It never exposes student personal identity, private account details, or raw file contents.
        </p>
      </main>
    </div>
  );
}
