// Orchestrates the similarity-detection layer: for one newly-hashed
// submission, compare it against every other eligible submission for the
// SAME assignment, and store the results.
//
// This is intentionally decoupled from the core submission state
// machine (UPLOADING -> STORED -> HASHED -> RECORDING -> CONFIRMED):
// it's triggered alongside that pipeline, but a failure here is caught
// and recorded, never thrown — it must never prevent a submission from
// reaching CONFIRMED. See the single call site in
// app/api/submissions/route.ts for how that's enforced.
import { createServiceRoleClient } from './supabase-server';
import { fetchFromR2 } from './r2';
import { extractText } from './text-extraction';
import { compareTexts, SIMILARITY_ALGORITHM_VERSION } from './similarity';
import { writeAuditLog } from './audit';

// Below this, a comparison is noise (near-zero overlap between any two
// documents of reasonable length) and not worth a database row.
const MIN_SCORE_TO_STORE = 15;

export async function computeSimilarityForSubmission(submission: {
  id: string;
  assignment_id: string;
  file_path: string;
  mime_type: string;
}): Promise<void> {
  const service = createServiceRoleClient();

  try {
    const thisText = await extractSubmissionText(submission.file_path, submission.mime_type);
    if (thisText === null) {
      // Not a failure — just an unsupported format (e.g. PPTX) or a ZIP
      // (never text-bearing). Nothing to compare.
      return;
    }

    // Every other CONFIRMED-or-later submission for the same assignment,
    // i.e. every submission that itself has a stable, hashed file. Two
    // submissions still mid-upload aren't compared against each other.
    const { data: others } = await service
      .from('submissions')
      .select('id, file_path, mime_type')
      .eq('assignment_id', submission.assignment_id)
      .neq('id', submission.id)
      .in('status', ['HASHED', 'RECORDING', 'CONFIRMED']);

    for (const other of others ?? []) {
      const otherText = await extractSubmissionText(other.file_path, other.mime_type);
      if (otherText === null) continue;

      const { score, evidence } = compareTexts(thisText, otherText);
      if (score < MIN_SCORE_TO_STORE) continue;

      // Canonical ordering — see 0007_similarity_matches.sql's
      // submission_pair_ordered check constraint.
      const [a, b] = [submission.id, other.id].sort();

      await service
        .from('submission_similarity_matches')
        .upsert(
          {
            assignment_id: submission.assignment_id,
            submission_id_a: a,
            submission_id_b: b,
            similarity_score: score,
            evidence,
            algorithm_version: SIMILARITY_ALGORITHM_VERSION,
            status: 'COMPLETED',
            error_message: null
          },
          { onConflict: 'submission_id_a,submission_id_b' }
        );
    }
  } catch (err) {
    console.error('Similarity computation failed', { submissionId: submission.id, error: err });
    // submission_similarity_matches has a submission_id_a < submission_id_b
    // check constraint — there's no valid self-pair row to represent
    // "this whole submission's analysis failed," so a failure isn't
    // recorded as a pairwise row at all. It goes through the existing
    // audit system instead (the project's one logging mechanism, not a
    // second one), so a teacher/admin can still see that analysis was
    // attempted and failed for this submission.
    await writeAuditLog({
      userId: null,
      action: 'SIMILARITY_ANALYSIS_FAILED',
      resourceType: 'submission',
      resourceId: submission.id,
      metadata: { error: err instanceof Error ? err.message : 'Unknown error' }
    }).catch(() => {
      // Swallow — this whole function is already inside a best-effort
      // path; a failed audit write here has nowhere further to go.
    });
  }
}

async function extractSubmissionText(filePath: string, mimeType: string): Promise<string | null> {
  const buffer = await fetchFromR2(filePath);
  return extractText(buffer, mimeType);
}
