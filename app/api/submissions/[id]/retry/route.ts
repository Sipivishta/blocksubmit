// PATCH /api/submissions/[id]/retry — retry the blockchain-recording step
// for a submission stuck in BLOCKCHAIN_FAILED, or recover a submission
// stuck in RECORDING (a crash between "tx sent" and "DB updated" leaves a
// row here — see recordSubmissionOnChain's idempotency handling in
// lib/blockchain.ts, which makes it safe to call again from either state).
// File + hash are already safely stored, so this only re-runs Step 4 of
// the state machine. It can NEVER move a submission out of CONFIRMED, and
// it never accepts a client-supplied status — the only legal transitions
// live in this file.
//
// Concurrency: the read-status -> write-RECORDING step is a
// compare-and-swap (`.eq('status', status)` on the update), not a plain
// write. If two retry requests race, only the one whose update actually
// matches a row (i.e. the row's status was still what it read a moment
// earlier) proceeds to call the blockchain; the loser gets 0 matched rows
// back and returns 409 immediately, without sending a transaction. This
// closes the race identified in the Phase 2 audit: the contract's
// write-once guarantee already made a *duplicate on-chain record*
// impossible, but without this CAS, a losing concurrent request could
// still reach recordSubmissionOnChain, send a transaction that reverts
// on-chain (AlreadyRecorded), and waste gas for a confusing 502. With the
// CAS, the losing request never gets that far.
export const runtime = 'nodejs';

import { requireUser, authErrorResponse, ForbiddenError } from '@/lib/auth';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import { recordSubmissionOnChain } from '@/lib/blockchain';
import { writeAuditLog } from '@/lib/audit';
import type { SubmissionStatus } from '@/types';
import { RETRYABLE_STATUSES } from '@/types';
import { validateMutationOrigin } from '@/lib/request-origin';

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = validateMutationOrigin(_req);
  if (originError) return originError;

  const service = createServiceRoleClient();
  let wonRace = false;

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

    // Explicit server-side ownership check (see grades/verify routes for
    // the same join-typing note): only the submitting student, the
    // assignment's own teacher, or an admin may retry.
    const assignment = submission.assignments as unknown as { teacher_id: string };
    const isOwner = submission.student_id === user.id;
    const isAssignmentTeacher = assignment.teacher_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    if (!isOwner && !isAssignmentTeacher && !isAdmin) {
      throw new ForbiddenError('You can only retry your own submission or one for your assignment');
    }

    const status = submission.status as SubmissionStatus;
    if (!RETRYABLE_STATUSES.includes(status)) {
      return Response.json(
        { error: `Cannot retry from status ${status}. Only BLOCKCHAIN_FAILED or a stuck RECORDING row is retryable.` },
        { status: 409 }
      );
    }
    if (!submission.file_hash) {
      return Response.json({ error: 'Submission has no file hash to record' }, { status: 409 });
    }

    // Compare-and-swap: only transitions to RECORDING if the row's status
    // is still exactly what we just read. `.select()` on an UPDATE
    // returns the matched+updated rows, so an empty array means another
    // concurrent request already changed the status first.
    const { data: claimed, error: claimError } = await service
      .from('submissions')
      .update({ status: 'RECORDING' })
      .eq('id', id)
      .eq('status', status)
      .select('id');

    if (claimError) {
      return Response.json({ error: claimError.message }, { status: 500 });
    }
    if (!claimed || claimed.length === 0) {
      return Response.json(
        { error: 'Retry is already in progress for this submission — try again shortly.' },
        { status: 409 }
      );
    }
    wonRace = true;

    const { txHash, blockNumber } = await recordSubmissionOnChain({
      submissionId: submission.id,
      studentId: submission.student_id,
      assignmentId: submission.assignment_id,
      fileHashHex: submission.file_hash
    });

    const { data: updated } = await service
      .from('submissions')
      .update({
        status: 'CONFIRMED',
        blockchain_tx_hash: txHash,
        blockchain_block_number: blockNumber,
        submitted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    await writeAuditLog({
      userId: user.id,
      action: 'BLOCKCHAIN_RETRY',
      resourceType: 'submission',
      resourceId: id,
      metadata: { txHash, blockNumber }
    });

    return Response.json({ submission: updated });
  } catch (err) {
    const authResp = authErrorResponse(err);
    if (authResp) return authResp;

    // Only reset to BLOCKCHAIN_FAILED if this request actually won the
    // CAS above (i.e. it — not a concurrent request — owns the RECORDING
    // transition it needs to revert). A request that lost the race
    // already returned 409 before reaching this point and never touched
    // the row here.
    if (wonRace) {
      const { id } = await params;
      await service.from('submissions').update({ status: 'BLOCKCHAIN_FAILED' }).eq('id', id);
    }

    console.error('Retry failed', err);
    return Response.json({ error: 'Retry failed' }, { status: 502 });
  }
}
