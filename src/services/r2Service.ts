import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import appSettingService from './appSettingService.js';

async function getR2Config() {
  const settings = await appSettingService.getSettingValues([
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_PUBLIC_BASE_URL',
  ]);
  const accountId = settings.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || '';
  const accessKeyId = settings.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = settings.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '';
  const bucket = settings.R2_BUCKET || process.env.R2_BUCKET || '';
  const publicBaseUrl = settings.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL || '';

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw { status: 400, message: 'Konfigurasi R2 belum lengkap.' };
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

export async function createPresignedUpload(key: string, contentType: string) {
  const { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl } = await getR2Config();
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
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
