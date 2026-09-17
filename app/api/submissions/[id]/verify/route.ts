// POST /api/submissions/[id]/verify — Teacher/Admin Verification Flow, and
// a student may verify their own submission ("request verification of
// their own submission" per spec). Recomputes SHA-256 from the file
// currently in R2 and compares it against the fingerprint recorded
// on-chain. This is the integrity check: if someone tampered with the R2
// object after submission, the hashes diverge and verified=false even
// though the DB row itself looks fine.
//
// Uses the Node.js runtime (not Edge) because it depends on the AWS SDK
// (lib/r2.ts) and ethers.js (lib/blockchain.ts), neither of which run on
// the Edge runtime.
export const runtime = 'nodejs';

import { requireUser, authErrorResponse, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { fetchFromR2 } from '@/lib/r2';
import { sha256Hex } from '@/lib/hash';
import { getOnChainRecord, explorerTxUrl } from '@/lib/blockchain';
import { writeAuditLog } from '@/lib/audit';
import type { VerificationResult } from '@/types';
import { validateMutationOrigin } from '@/lib/request-origin';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = validateMutationOrigin(_req);
  if (originError) return originError;

  try {
    const user = await requireUser();
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*, assignments!inner(teacher_id)')
      .eq('id', id)
      .single();

    if (error || !submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    // postgrest-js types a joined to-one table as an array without
    // generated Database types (see app/api/grades/route.ts for the same
    // note) — assignment_id is a not-null FK, so this is always one row.
    const assignment = submission.assignments as unknown as { teacher_id: string };
    const isOwner = submission.student_id === user.id;
    const isAssignmentTeacher = assignment.teacher_id === user.id;
    const isAdmin = user.role === 'ADMIN';

    // Explicit server-side ownership check beyond RLS: a teacher may only
    // verify submissions to their own assignments; a student only their
    // own submission. RLS already filters the select to this scope, but we
    // assert it again for a clear 403 vs an ambiguous 404.
    if (!isOwner && !isAssignmentTeacher && !isAdmin) {
      throw new ForbiddenError('You can only verify your own submission or one for your assignment');
    }

    if (submission.status !== 'CONFIRMED') {
      return Response.json(
        { error: `Submission is not confirmed on-chain (status: ${submission.status})` },
        { status: 409 }
      );
    }

    const [fileBytes, onChain] = await Promise.all([
      fetchFromR2(submission.file_path),
      getOnChainRecord(submission.id)
    ]);

    if (!onChain) {
      return Response.json({ error: 'No on-chain record found for this submission' }, { status: 409 });
    }

    const currentHash = sha256Hex(fileBytes);
    const verified = currentHash === onChain.fileHashHex;

    const result: VerificationResult = {
      submissionId: submission.id,
      verified,
      currentHash,
      onChainHash: onChain.fileHashHex,
      transactionHash: submission.blockchain_tx_hash,
      blockNumber: submission.blockchain_block_number,
      explorerUrl: submission.blockchain_tx_hash ? explorerTxUrl(submission.blockchain_tx_hash) : null,
      checkedAt: new Date().toISOString()
    };

    await writeAuditLog({
      userId: user.id,
      action: 'VERIFICATION_REQUESTED',
      resourceType: 'submission',
      resourceId: submission.id,
      metadata: { verified }
    });

    return Response.json(result);
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
