// Cloudflare R2 client (S3-compatible API). Files are never served through
// a permanent public URL — every read/write path goes through a short-lived
// presigned URL generated here, after an authorization check upstream.
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const TTL_SECONDS = Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS ?? 300);

/** Build the structured object key for a submission's file. */
export function buildSubmissionKey(submissionId: string, sanitizedFileName: string): string {
  return `submissions/${submissionId}/${sanitizedFileName}`;
}

/**
 * Upload a file buffer to R2. Called server-side after validation
 * (MIME type, size, filename sanitization) — never a direct client upload.
 */
export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
}

/** Generate a short-lived presigned GET URL for downloading a file. */
export async function getPresignedDownloadUrl(key: string, fileName: string): Promise<string> {
  const safeFileName = fileName.replace(/["\r\n]/g, '_');
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${safeFileName}"`
  });
  return getSignedUrl(r2Client, command, { expiresIn: TTL_SECONDS });
}

/** Fetch a file's bytes server-side, e.g. to recompute a hash for verification. */
export async function fetchFromR2(key: string): Promise<Buffer> {
  const result = await r2Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const stream = result.Body as unknown as AsyncIterable<Uint8Array>;
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Sanitize a user-supplied filename before it ever becomes part of an R2 key. */
export function sanitizeFileName(name: string): string {
  const base = name.normalize('NFKD').replace(/[^\w.\- ]/g, '');
  const trimmed = base.trim().replace(/\s+/g, '_');
  return trimmed.slice(0, 200) || 'file';
}
