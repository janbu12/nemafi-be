import RouterOSClient from 'ros-client';
import { prismaClient } from '../application/prisma.js';
import { Profile, Router } from '@prisma/client';

const SIMULATION_HOST = 'SIMULATION';

type RouterOSApi = {
  send(words: string[]): Promise<Array<Record<string, string>>>;
};

function isSimulation(router: Router) {
  return process.env.MIKROTIK_SIMULATION === 'true' || router.host === SIMULATION_HOST;
}

async function getRouter(routerId: number) {
  const router = await prismaClient.router.findUnique({ where: { id: routerId } });
  if (!router) throw { status: 404, message: `Router with ID ${routerId} not found in database.` };
  return router;
}

async function withRouterApi<T>(routerId: number, handler: (api: any) => Promise<T>): Promise<T> {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    throw { status: 400, message: 'Router is configured for simulation mode.' };
  }

  // Legacy implementation:
  // const client = new RouterOSClient from 'routeros-client'({
  //   host: router.host,
  //   user: router.user,
  //   password: router.password,
  //   port: router.portApi || router.port || 8728,
  // });
  //
  // Client lama tersebut bergantung pada node-routeros dan dapat crash pada
  // RouterOS 7.18+ saat router mengembalikan reply !empty.
  const client = new RouterOSClient({
    host: router.host,
    username: router.user,
    password: router.password,
    port: router.portApi || router.port || 8728,
    tls: false,
    timeout: 10000,
  });

  const api = await client.connect();
  try {
    return await handler(api);
  } finally {
    await client.close();
  }
}

async function findPppSecret(api: RouterOSApi, username: string) {
  const rows = await api.send(['/ppp/secret/print', `?name=${username}`]);
  return rows[0] ?? null;
}

function getRouterOSId(row: Record<string, string>) {
  return row['.id'] || row.id;
}

// Menambahkan user PPP baru
async function addPppSecret(profile: Profile & { router: Router }) {
  if (!profile.routerId || !profile.pppUsername || !profile.pppPassword || !profile.pppProfile) {
    throw { status: 400, message: 'PPP information is incomplete for this user.' };
  }

  if (isSimulation(profile.router)) {
    await prismaClient.profile.update({
      where: { id: profile.id },
      data: { isPppActive: true },
    });
    return;
  }

  return withRouterApi(profile.routerId, async (api: RouterOSApi) => {
    const command = [
      '/ppp/secret/add',
      `=name=${profile.pppUsername}`,
      `=password=${profile.pppPassword}`,
      '=service=pppoe',
    ];
    if (profile.pppProfile?.trim()) {
      command.push(`=profile=${profile.pppProfile.trim()}`);
    }
    await api.send(command);
  });
}

// Mengubah paket/profil user PPP
async function updatePppProfile(username: string, routerId: number, newProfile: string) {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    const existing = await prismaClient.profile.findFirst({
      where: { routerId, pppUsername: username },
    });
    if (!existing) {
      throw { status: 404, message: `PPP user '${username}' not found on simulator.` };
    }
    await prismaClient.profile.update({
      where: { id: existing.id },
      data: { pppProfile: newProfile },
    });
    return;
  }

  return withRouterApi(routerId, async (api: RouterOSApi) => {
    const secret = await findPppSecret(api, username);
    if (!secret) {
      throw { status: 404, message: `PPP user '${username}' not found on the router.` };
    }
    await api.send(['/ppp/secret/set', `=.id=${getRouterOSId(secret)}`, `=profile=${newProfile}`]);
  });
}

// Menonaktifkan (suspend) user PPP
async function disablePppSecret(username: string, routerId: number) {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    const existing = await prismaClient.profile.findFirst({
      where: { routerId, pppUsername: username },
    });
    if (!existing) throw { status: 404, message: `PPP user '${username}' not found on simulator.` };
    await prismaClient.profile.update({
      where: { id: existing.id },
      data: { isPppActive: false },
    });
    return;
  }

  return withRouterApi(routerId, async (api: RouterOSApi) => {
    const secret = await findPppSecret(api, username);
    if (!secret) throw { status: 404, message: `PPP user '${username}' not found.` };
    await api.send(['/ppp/secret/disable', `=.id=${getRouterOSId(secret)}`]);
  });
}

// Mengaktifkan kembali user PPP
async function enablePppSecret(username: string, routerId: number) {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    const existing = await prismaClient.profile.findFirst({
      where: { routerId, pppUsername: username },
    });
    if (!existing) throw { status: 404, message: `PPP user '${username}' not found on simulator.` };
    await prismaClient.profile.update({
      where: { id: existing.id },
      data: { isPppActive: true },
    });
    return;
  }

  return withRouterApi(routerId, async (api: RouterOSApi) => {
    const secret = await findPppSecret(api, username);
    if (!secret) throw { status: 404, message: `PPP user '${username}' not found.` };
    await api.send(['/ppp/secret/enable', `=.id=${getRouterOSId(secret)}`]);
  });
}

// Tambah PPPoE/PPP Secret sederhana
async function createPppSecret(routerId: number, data: { name: string; password: string; profile?: string }) {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    const existing = await prismaClient.profile.findFirst({
      where: { routerId, pppUsername: data.name },
    });
    if (!existing) {
      throw { status: 404, message: `PPP user '${data.name}' not found on simulator.` };
    }
    await prismaClient.profile.update({
      where: { id: existing.id },
      data: {
        pppPassword: data.password,
        pppProfile: data.profile ?? existing.pppProfile,
        isPppActive: true,
      },
    });
    return { success: true };
  }

  return withRouterApi(routerId, async (api: RouterOSApi) => {
    const command = [
      '/ppp/secret/add',
      `=name=${data.name}`,
      `=password=${data.password}`,
      '=service=pppoe',
    ];
    if (data.profile?.trim()) {
      command.push(`=profile=${data.profile.trim()}`);
    }
    await api.send(command);
    return { success: true };
  });
}

// Melihat user aktif di sebuah router
async function getActiveUsers(routerId: number) {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    const activeProfiles = await prismaClient.profile.findMany({
      where: { routerId, isPppActive: true, pppUsername: { not: null } },
    });
    return activeProfiles.map((profile) => ({
      name: profile.pppUsername,
      service: 'pppoe',
      profile: profile.pppProfile,
    }));
  }

  return withRouterApi(routerId, (api: RouterOSApi) => api.send(['/ppp/active/print']));
}

/**
 * Mengetes koneksi ke sebuah router.
 */
async function testConnection(routerId: number) {
  try {     
   const router = await getRouter(routerId);
   if (isSimulation(router)) {
    return { success: true, message: 'Simulation connection successful.' };
   }
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
