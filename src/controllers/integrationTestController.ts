import { Request, Response } from 'express';
import { success } from '../utils/responseHandler.js';
import { prismaClient } from '../application/prisma.js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testR2(_req: Request, res: Response, next: Function) {
  try {
    const settings = await prismaClient.appSetting.findMany({
      where: {
        key: { in: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] },
      },
    });
    const getValue = (key: string) => settings.find((s) => s.key === key)?.value || '';
    const accountId = getValue('R2_ACCOUNT_ID');
    const accessKeyId = getValue('R2_ACCESS_KEY_ID');
    const secretAccessKey = getValue('R2_SECRET_ACCESS_KEY');
    const bucket = getValue('R2_BUCKET');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw { status: 400, message: 'Lengkapi konfigurasi R2 terlebih dahulu.' };
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    return success(res, { ok: true }, 'R2 terhubung');
  } catch (e: any) {
    if (e?.status) return next(e);
    next({ status: 500, message: e?.message || 'Gagal menguji koneksi R2.' });
  }
}

async function testMidtrans(_req: Request, res: Response, next: Function) {
  try {
    const settings = await prismaClient.appSetting.findMany({
      where: {
        key: { in: ['MIDTRANS_SERVER_KEY'] },
      },
    });
    const getValue = (key: string) => settings.find((s) => s.key === key)?.value || '';
    const serverKey = getValue('MIDTRANS_SERVER_KEY');
    const snapUrl =
      process.env.MIDTRANS_SNAP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js');

    if (!serverKey || !snapUrl) {
      throw { status: 400, message: 'Lengkapi konfigurasi Midtrans terlebih dahulu.' };
    }

    const baseUrl = snapUrl.includes('sandbox')
      ? 'https://api.sandbox.midtrans.com/v2/transactions'
      : 'https://api.midtrans.com/v2/transactions';
    const auth = Buffer.from(`${serverKey}:`).toString('base64');

    const response = await fetch(`${baseUrl}/status`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw { status: 502, message: text || 'Gagal menghubungi Midtrans.' };
    }
    return success(res, { ok: true }, 'Midtrans terhubung');
  } catch (e: any) {
    if (e?.status) return next(e);
    next({ status: 500, message: e?.message || 'Gagal menguji koneksi Midtrans.' });
  }
}

async function testGemini(_req: Request, res: Response, next: Function) {
  try {
    const settings = await prismaClient.appSetting.findMany({
      where: { key: { in: ['GEMINI_API_KEY', 'GEMINI_MODEL'] } },
    });
    const getValue = (key: string) => settings.find((s) => s.key === key)?.value || '';
    const apiKey = getValue('GEMINI_API_KEY');
    const model = getValue('GEMINI_MODEL') || 'gemini-1.5-flash';

    if (!apiKey) {
      throw { status: 400, message: 'Lengkapi konfigurasi Gemini terlebih dahulu.' };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model });
    await generativeModel.generateContent('Halo');
    return success(res, { ok: true }, 'Gemini terhubung');
  } catch (e: any) {
    if (e?.status) return next(e);
    next({ status: 500, message: e?.message || 'Gagal menguji koneksi Gemini.' });
  }
}

export default {
  testR2,
  testMidtrans,
  testGemini,
};
