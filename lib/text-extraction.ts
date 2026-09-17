// Extracts plain text from a submission's file bytes, for the similarity
// comparison pipeline only — this text is never persisted, never shown
// to anyone, and never leaves this process; only the resulting score and
// short evidence phrases (from lib/similarity.ts) get stored.
//
// PDF and DOCX are supported. PPTX is not: reliably extracting slide
// text without a heavy dependency isn't something this pass implements,
// and pretending it works would be worse than saying so plainly —
// callers get `null` back and the caller (see the similarity-computation
// trigger in app/api/submissions/route.ts) treats that as "nothing to
// compare," not as an error.
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractText(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text;
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    // PPTX and anything else: no extractor implemented.
    return null;
  } catch (err) {
    // A malformed or unparseable file must never break the caller —
    // the similarity layer treats a failed extraction as "skip this
    // submission," never as a reason to fail the submission pipeline.
    console.error('Text extraction failed', { mimeType, error: err });
    return null;
  }
}
