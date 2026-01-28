import { prismaClient } from '../application/prisma.js';

const CACHE_TTL_MS = 60 * 1000;
const cacheStore = new Map<string, { value: string; expiresAt: number }>();

function getCached(key: string) {
  const cached = cacheStore.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return cached.value;
}

function setCached(key: string, value: string) {
  cacheStore.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function clearCache(keys?: string[]) {
  if (!keys) {
    cacheStore.clear();
    return;
  }
  keys.forEach((key) => cacheStore.delete(key));
}

export type AppSettingInput = {
  key: string;
  value: string;
  group: string;
  type: string;
  isSecret?: boolean;
};

async function listSettings() {
  return prismaClient.appSetting.findMany({
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  });
}

async function updateSettings(settings: AppSettingInput[], updatedBy?: number | null) {
  const updates = settings.map((setting) =>
    prismaClient.appSetting.update({
      where: { key: setting.key },
      data: {
        value: setting.value,
        group: setting.group,
        type: setting.type,
        isSecret: setting.isSecret ?? false,
        updatedBy: updatedBy ?? null,
      },
    })
  );
  const result = await Promise.all(updates);
  clearCache(settings.map((setting) => setting.key));
  return result;
}

async function getSettingValue(key: string) {
  const cached = getCached(key);
  if (cached !== null) return cached;
  const setting = await prismaClient.appSetting.findUnique({ where: { key } });
  const value = setting?.value ?? null;
  if (value !== null) setCached(key, value);
  return value;
}

async function getSettingValues(keys: string[]) {
  const result: Record<string, string> = {};
  const missingKeys: string[] = [];

  keys.forEach((key) => {
    const cached = getCached(key);
    if (cached !== null) {
      result[key] = cached;
    } else {
      missingKeys.push(key);
    }
  });

  if (missingKeys.length > 0) {
    const settings = await prismaClient.appSetting.findMany({ where: { key: { in: missingKeys } } });
    missingKeys.forEach((key) => {
      const value = settings.find((s) => s.key === key)?.value ?? '';
      result[key] = value;
      setCached(key, value);
    });
  }

  return result;
}

export default {
  listSettings,
  updateSettings,
  getSettingValue,
  getSettingValues,
  clearCache,
};
