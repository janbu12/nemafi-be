import { RouterOSClient } from 'routeros-client';
import { prismaClient } from '../application/prisma.js';
import { Profile, Router } from '@prisma/client';

async function withRouterApi<T>(routerId: number, handler: (api: any) => Promise<T>): Promise<T> {
  const router = await prismaClient.router.findUnique({ where: { id: routerId } });
  if (!router) throw { status: 404, message: `Router with ID ${routerId} not found in database.` };

  const client = new RouterOSClient({
    host: router.host,
    user: router.user,
    password: router.password,
    port: router.portApi || router.port || 8728,
  });

  const api = await client.connect();
  try {
    return await handler(api);
  } finally {
    await client.close();
  }
}

// Menambahkan user PPP baru
async function addPppSecret(profile: Profile & { router: Router }) {
  if (!profile.routerId || !profile.pppUsername || !profile.pppPassword || !profile.pppProfile) {
    throw { status: 400, message: 'PPP information is incomplete for this user.' };
  }

  return withRouterApi(profile.routerId, async (api) => {
    const payload: any = {
      name: profile.pppUsername,
      password: profile.pppPassword,
      service: 'pppoe',
    };
    if (profile.pppProfile?.trim()) {
      payload.profile = profile.pppProfile.trim();
    }
    await api.menu('/ppp/secret').add(payload);
  });
}

// Mengubah paket/profil user PPP
async function updatePppProfile(username: string, routerId: number, newProfile: string) {
  return withRouterApi(routerId, async (api) => {
    const secrets = await api.menu('/ppp/secret').getAll({ name: username });
    if (secrets.length === 0) {
      throw { status: 404, message: `PPP user '${username}' not found on the router.` };
    }
    await api.menu('/ppp/secret').set(secrets[0].id, { profile: newProfile });
  });
}

// Menonaktifkan (suspend) user PPP
async function disablePppSecret(username: string, routerId: number) {
  return withRouterApi(routerId, async (api) => {
    const secrets = await api.menu('/ppp/secret').getAll({ name: username });
    if (secrets.length === 0) throw { status: 404, message: `PPP user '${username}' not found.` };
    await api.menu('/ppp/secret').disable(secrets[0].id);
  });
}

// Mengaktifkan kembali user PPP
async function enablePppSecret(username: string, routerId: number) {
  return withRouterApi(routerId, async (api) => {
    const secrets = await api.menu('/ppp/secret').getAll({ name: username });
    if (secrets.length === 0) throw { status: 404, message: `PPP user '${username}' not found.` };
    await api.menu('/ppp/secret').enable(secrets[0].id);
  });
}

// Tambah PPPoE/PPP Secret sederhana
async function createPppSecret(routerId: number, data: { name: string; password: string; profile?: string }) {
  return withRouterApi(routerId, async (api) => {
    const payload: any = {
      name: data.name,
      password: data.password,
      service: 'pppoe',
    };
    if (data.profile?.trim()) {
      payload.profile = data.profile.trim();
    }
    await api.menu('/ppp/secret').add(payload);
    return { success: true };
  });
}

// Melihat user aktif di sebuah router
async function getActiveUsers(routerId: number) {
  return withRouterApi(routerId, (api) => api.menu('/ppp/active').getAll());
}

/**
 * Mengetes koneksi ke sebuah router.
 */
async function testConnection(routerId: number) {
  try {     
   return await withRouterApi(routerId, async () => ({ success: true, message: 'Connection successful.' }));
  } catch (err: any) {
    throw { status: 500, message: `Failed to connect to router: ${err.message}` };
  }
}

export default {
  addPppSecret,
  updatePppProfile,
  disablePppSecret,
  enablePppSecret,
  getActiveUsers,
  testConnection,
  createPppSecret,
};
