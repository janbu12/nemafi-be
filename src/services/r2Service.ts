import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const bucket = process.env.R2_BUCKET || '';
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || '';

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.warn('[r2Service] Missing R2 env configuration.');
}

const client = new S3Client({
  region: 'auto',
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: accountId
    ? {
        accessKeyId,
        secretAccessKey,
      }
    : undefined,
});

export async function createPresignedUpload(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
  const base = publicBaseUrl || (accountId ? `https://${bucket}.${accountId}.r2.cloudflarestorage.com` : '');
  const publicUrl = base ? `${base.replace(/\/$/, '')}/${key}` : '';

  return { uploadUrl, publicUrl, key };
}
