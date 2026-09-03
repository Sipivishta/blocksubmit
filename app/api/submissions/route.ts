// POST /api/submissions — the full student submission flow:
//   UPLOADING -> STORED -> HASHED -> RECORDING -> CONFIRMED
//                                          \-> BLOCKCHAIN_FAILED (retryable)
// GET  /api/submissions?assignmentId=... — list submissions
//   (students see only their own via RLS; teachers see all for their
//   assignments via RLS; this route just runs the query, RLS enforces scope)
//
// Runs on the Node.js runtime (not Edge): depends on the AWS SDK (lib/r2.ts),
// ethers.js (lib/blockchain.ts), and Node's crypto (lib/hash.ts).
export const runtime = 'nodejs';

import { requireUser, requireRole, authErrorResponse } from '@/lib/auth';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/audit';
import { buildSubmissionKey, sanitizeFileName, uploadToR2 } from '@/lib/r2';
import { sha256Hex } from '@/lib/hash';
import { recordSubmissionOnChain } from '@/lib/blockchain';
import { detectValidatedMimeType } from '@/lib/file-validation';
import { validateMutationOrigin } from '@/lib/request-origin';

const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 20 * 1024 * 1024);

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');

    const supabase = await createServerClient();
    let query = supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (assignmentId) query = query.eq('assignment_id', assignmentId);

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ submissions: data });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;

  let student;
  try {
    student = await requireRole('STUDENT');
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const assignmentId = formData.get('assignmentId');

    if (!(file instanceof File) || typeof assignmentId !== 'string' || !assignmentId) {
      return Response.json({ error: 'file and assignmentId are required' }, { status: 400 });
    }

    // ---- Server-side validation (never trust client-declared type/size) ----
    if (file.size > MAX_UPLOAD_SIZE) {
      return Response.json({ error: 'Unsupported or invalid file type.' }, { status: 400 });
    }
    if (file.size === 0) {
      return Response.json({ error: 'Unsupported or invalid file type.' }, { status: 400 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } catch (err) {
      console.error('Failed to read uploaded file', err);
      return Response.json({ error: 'Unsupported or invalid file type.' }, { status: 400 });
    }
    if (fileBuffer.length === 0 || fileBuffer.length > MAX_UPLOAD_SIZE) {
      return Response.json({ error: 'Unsupported or invalid file type.' }, { status: 400 });
    }

    const validatedMimeType = detectValidatedMimeType(fileBuffer);
    if (!validatedMimeType) {
      return Response.json({ error: 'Unsupported or invalid file type.' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const service = createServiceRoleClient(); // for cross-user-safe state transitions

    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return Response.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const sanitizedName = sanitizeFileName(file.name);

    // ---- Step 1: create the row in UPLOADING ----
    // This insert IS the idempotency boundary for the "create a new
    // submission" step: the DB's UNIQUE(assignment_id, student_id)
    // constraint means a retried request can never create a second row —
    // it fails with 23505 and the client is told a submission already
    // exists (with its current status) instead of silently duplicating.
    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: student.id,
        file_name: sanitizedName,
        file_path: '', // filled in once bytes are actually in R2
        file_size: fileBuffer.length,
        mime_type: validatedMimeType,
        status: 'UPLOADING'
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: existing } = await supabase
          .from('submissions')
          .select('id, status')
          .eq('assignment_id', assignmentId)
          .eq('student_id', student.id)
          .maybeSingle();
        return Response.json(
          {
            error: 'You have already submitted for this assignment',
            existingSubmissionId: existing?.id,
            existingStatus: existing?.status
          },
          { status: 409 }
        );
      }
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    const submissionId = submission.id as string;
    const key = buildSubmissionKey(submissionId, sanitizedName);

    await writeAuditLog({
      userId: student.id,
      action: 'SUBMISSION_CREATED',
      resourceType: 'submission',
      resourceId: submissionId,
      metadata: { assignmentId, fileName: sanitizedName }
    });

    // ---- Step 2: upload bytes to R2, mark STORED ----
    try {
      await uploadToR2(key, fileBuffer, validatedMimeType);
      await service.from('submissions').update({ file_path: key, status: 'STORED' }).eq('id', submissionId);
      await writeAuditLog({
        userId: student.id,
        action: 'FILE_UPLOADED',
        resourceType: 'submission',
        resourceId: submissionId,
        metadata: { key, size: fileBuffer.length }
      });
    } catch (err) {
      await service.from('submissions').update({ status: 'UPLOAD_FAILED' }).eq('id', submissionId);
      console.error('R2 upload failed', err);
      return Response.json({ error: 'File upload failed', submissionId }, { status: 502 });
    }

    // ---- Step 3: hash, mark HASHED ----
    let fileHash: string;
    try {
      fileHash = sha256Hex(fileBuffer);
      await service.from('submissions').update({ file_hash: fileHash, status: 'HASHED' }).eq('id', submissionId);
      await writeAuditLog({
        userId: student.id,
        action: 'HASH_CREATED',
        resourceType: 'submission',
        resourceId: submissionId,
        metadata: { fileHash }
      });
    } catch (err) {
      await service.from('submissions').update({ status: 'HASH_FAILED' }).eq('id', submissionId);
      console.error('Hashing failed', err);
      return Response.json({ error: 'Hashing failed', submissionId }, { status: 500 });
    }

    // ---- Step 4: record on-chain, mark RECORDING -> CONFIRMED ----
    await service.from('submissions').update({ status: 'RECORDING' }).eq('id', submissionId);

    try {
      const { txHash, blockNumber } = await recordSubmissionOnChain({
        submissionId,
        studentId: student.id,
        assignmentId,
        fileHashHex: fileHash
      });

      const submittedAt = new Date().toISOString();
      const { data: confirmed } = await service
        .from('submissions')
        .update({
          status: 'CONFIRMED',
          blockchain_tx_hash: txHash,
          blockchain_block_number: blockNumber,
          submitted_at: submittedAt
        })
        .eq('id', submissionId)
        .select()
        .single();

      await writeAuditLog({
        userId: student.id,
        action: 'BLOCKCHAIN_RECORDED',
        resourceType: 'submission',
        resourceId: submissionId,
        metadata: { txHash, blockNumber }
      });

      return Response.json({ submission: confirmed }, { status: 201 });
    } catch (err) {
      // Retryable: the file is safely stored and hashed; only the on-chain
      // step failed. See PATCH /api/submissions/[id]/retry. If the crash
      // happens between tx confirmation and this catch block running,
      // recordSubmissionOnChain's own idempotency check (see lib/blockchain.ts)
      // is what actually protects against a duplicate on-chain record on retry —
      // not this status field, which is only ever a hint for the client.
      await service.from('submissions').update({ status: 'BLOCKCHAIN_FAILED' }).eq('id', submissionId);
      console.error('Blockchain recording failed', err);
      return Response.json(
        { error: 'Blockchain recording failed; file was saved and can be retried', submissionId },
        { status: 502 }
      );
    }
  } catch (err) {
    // Catch-all: anything unexpected (malformed form data, DB connection
    // drop, etc.) before Step 1 completes returns a safe JSON 500 instead
    // of leaking a stack trace via Next's default error page.
    console.error('Unexpected error in submission upload', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
