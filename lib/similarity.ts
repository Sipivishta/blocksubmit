// Deterministic, explainable text-similarity comparison for the
// plagiarism/similarity-detection feature. Answers a different question
// than lib/hash.ts's SHA-256: not "has this exact file changed," but
// "does this submission's text resemble another submission's text."
//
// Algorithm: normalize -> tokenize -> k-shingle (5-word overlapping
// windows) -> Jaccard similarity between the two shingle sets. This is
// the standard approach for near-duplicate/plagiarism detection (the
// same family of technique behind tools like MOSS and Turnitin's older
// generations) — it's insensitive to reordering of unrelated sections,
// catches paraphrasing-lite (word substitutions, punctuation/whitespace
// changes) because most of a 5-word window still matches even when one
// word inside it changes, and is fully explainable: every score traces
// back to a concrete set of shared 5-word phrases, which is also exactly
// the evidence a teacher needs to see why a pair was flagged.
//
// Bump this string whenever the algorithm changes, so stored results
// (submission_similarity_matches.algorithm_version) can be told apart
// from results a future version would produce differently.
export const SIMILARITY_ALGORITHM_VERSION = 'shingle-jaccard-v1';

const SHINGLE_SIZE = 5;
const MAX_EVIDENCE_PHRASES = 5;

// Known characteristic, not a bug: with a document shorter than roughly
// 2x SHINGLE_SIZE tokens, a single changed word can fall inside every
// shingle the document produces, driving overlap to zero even though
// most of the text is unchanged. This algorithm is designed for
// document-length submissions (typically hundreds of words), where a
// localized change only ever affects a small fraction of the total
// shingle set — verified in tests against a realistic paragraph, not
// just single sentences.

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.length > 0 ? normalized.split(' ') : [];
}

/** Overlapping k-word windows, as a set (duplicates collapse — this measures
 * shared vocabulary structure, not raw phrase-count). */
export function shingle(tokens: string[], k: number = SHINGLE_SIZE): Set<string> {
  const shingles = new Set<string>();
  if (tokens.length === 0) return shingles;
  if (tokens.length < k) {
    shingles.add(tokens.join(' '));
    return shingles;
  }
  for (let i = 0; i <= tokens.length - k; i++) {
    shingles.add(tokens.slice(i, i + k).join(' '));
  }
  return shingles;
}

/** |A ∩ B| / |A ∪ B|, in [0, 1]. Two empty sets are defined as 0 similarity
 * (not 1) — two blank/unparseable documents shouldn't score as identical. */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersectionSize = 0;
  for (const item of a) {
    if (b.has(item)) intersectionSize++;
  }
  const unionSize = a.size + b.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

export interface SimilarityResult {
  /** 0-100, two decimal places. */
  score: number;
  /** Up to MAX_EVIDENCE_PHRASES shared 5-word phrases, longest-first. */
  evidence: string[];
}

export function compareTexts(textA: string, textB: string): SimilarityResult {
  const shinglesA = shingle(tokenize(textA));
  const shinglesB = shingle(tokenize(textB));
  const jaccard = jaccardSimilarity(shinglesA, shinglesB);
  const score = Math.round(jaccard * 10000) / 100;

  const shared: string[] = [];
  for (const s of shinglesA) {
    if (shinglesB.has(s)) shared.push(s);
  }
  const evidence = shared.sort((x, y) => y.length - x.length).slice(0, MAX_EVIDENCE_PHRASES);

  return { score, evidence };
}
