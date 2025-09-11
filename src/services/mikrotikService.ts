import { RouterOSClient } from 'routeros-client';
import { prismaClient } from '../application/prisma.js';
import { Profile, Router } from '@prisma/client';

// Helper untuk koneksi ke router berdasarkan ID
async function getRouterConnection(routerId: number): Promise<RouterOSClient> {
  const router = await prismaClient.router.findUnique({ where: { id: routerId } });
  if (!router) throw { status: 404, message: `Router with ID ${routerId} not found in database.` };

  const client = new RouterOSClient({
    host: router.host,
    user: router.user,
    password: router.password,
    port: router.port || 8728,
  });

  await client.connect();
  return client;
}

// Menambahkan user PPP baru
async function addPppSecret(profile: Profile & { router: Router }) {
  if (!profile.routerId || !profile.pppUsername || !profile.pppPassword || !profile.pppProfile) {
    throw { status: 400, message: 'PPP information is incomplete for this user.' };
  }
  
  const client = await getRouterConnection(profile.routerId);
  try {
    await client.menu('/ppp/secret').add({
      name: profile.pppUsername,
      password: profile.pppPassword,
      profile: profile.pppProfile,
      service: 'pppoe',
    });
  } finally {
    client.close();
  }
}

// Mengubah paket/profil user PPP
async function updatePppProfile(username: string, routerId: number, newProfile: string) {
  const client = await getRouterConnection(routerId);
  try {
    const secrets = await client.menu('/ppp/secret').getAll({ name: username });
    if (secrets.length === 0) {
      throw { status: 404, message: `PPP user '${username}' not found on the router.` };
    }
    await client.menu('/ppp/secret').set(secrets[0].id, { profile: newProfile });
  } finally {
    client.close();
  }
}

// Menonaktifkan (suspend) user PPP
async function disablePppSecret(username: string, routerId: number) {
  const client = await getRouterConnection(routerId);
  try {
    const secrets = await client.menu('/ppp/secret').getAll({ name: username });
    if (secrets.length === 0) throw { status: 404, message: `PPP user '${username}' not found.` };
    await client.menu('/ppp/secret').disable(secrets[0].id);
  } finally {
    client.close();
  }
}

// Mengaktifkan kembali user PPP
async function enablePppSecret(username: string, routerId: number) {
    const client = await getRouterConnection(routerId);
    try {
      const secrets = await client.menu('/ppp/secret').getAll({ name: username });
      if (secrets.length === 0) throw { status: 404, message: `PPP user '${username}' not found.` };
      await client.menu('/ppp/secret').enable(secrets[0].id);
    } finally {
      client.close();
    }
}

// Melihat user aktif di sebuah router
async function getActiveUsers(routerId: number) {
  const client = await getRouterConnection(routerId);
  try {
    return await client.menu('/ppp/active').getAll();
  } finally {
    client.close();
  }
}

/**
 * Mengetes koneksi ke sebuah router.
 */
async function testConnection(routerId: number) {
  try {
    const client = await getRouterConnection(routerId);
    await client.close();
    return { success: true, message: 'Connection successful.' };
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
};