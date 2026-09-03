// GET /api/health — checks DB + R2 + blockchain connectivity. No auth
// required. Never returns credentials, connection strings, or keys —
// only ok/unavailable per dependency.
export const runtime = 'nodejs';

import { createServiceRoleClient } from '@/lib/supabase-server';
import { checkBlockchainHealth } from '@/lib/blockchain';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

async function checkDb(): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function checkR2(): Promise<boolean> {
  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      }
    });
    await client.send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET_NAME! }));
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const [db, storage, blockchain] = await Promise.all([checkDb(), checkR2(), checkBlockchainHealth()]);
  const healthy = db && storage && blockchain;

  return Response.json(
    {
      status: healthy ? 'ok' : 'degraded',
      services: {
        database: db ? 'ok' : 'unavailable',
        storage: storage ? 'ok' : 'unavailable',
        blockchain: blockchain ? 'ok' : 'unavailable'
      }
    },
    { status: healthy ? 200 : 503 }
  );
}
