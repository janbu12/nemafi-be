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
    const existing = await findPppSecret(api, profile.pppUsername!);
    if (existing) {
      const updateCommand = [
        '/ppp/secret/set',
        `=.id=${getRouterOSId(existing)}`,
        `=password=${profile.pppPassword}`,
      ];
      if (profile.pppProfile?.trim()) {
        updateCommand.push(`=profile=${profile.pppProfile.trim()}`);
      }
      await api.send(updateCommand);
      return;
    }

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

    try {
      const activeConnections = await api.send(['/ppp/active/print', `?name=${username}`]);
      for (const conn of activeConnections) {
        await api.send(['/ppp/active/remove', `=.id=${getRouterOSId(conn)}`]);
      }
    } catch (err) {
      console.warn(`[Mikrotik] Failed to remove active connection for ${username}`);
    }
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

function formatSpeed(speedMbps: number): string {
  if (speedMbps <= 0) return '0';
  if (Number.isInteger(speedMbps)) {
    return `${speedMbps}M`;
  }
  return `${Math.round(speedMbps * 1000)}k`;
}

function generateRateLimitString(uploadSpeed: number, downloadSpeed: number): string {
  if (uploadSpeed <= 0 && downloadSpeed <= 0) return '';
  return `${formatSpeed(uploadSpeed)}/${formatSpeed(downloadSpeed)}`;
}

async function syncPackageToRouter(
  routerId: number,
  pkg: { name: string; uploadSpeed: number; downloadSpeed: number }
) {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    return;
  }

  const rateLimit = generateRateLimitString(pkg.uploadSpeed, pkg.downloadSpeed);
  const localAddress = router.pppLocalAddress || process.env.MIKROTIK_DEFAULT_PPP_LOCAL_ADDRESS || '172.16.0.1';
  const remoteAddress = router.pppRemoteAddress || process.env.MIKROTIK_DEFAULT_PPP_REMOTE_ADDRESS || 'pppoe-pool';

  return withRouterApi(routerId, async (api: RouterOSApi) => {
    const profiles = await api.send(['/ppp/profile/print', `?name=${pkg.name}`]);
    const existingProfile = profiles[0] ?? null;

    if (!existingProfile) {
      const command = [
        '/ppp/profile/add',
        `=name=${pkg.name}`,
        `=local-address=${localAddress}`,
        `=remote-address=${remoteAddress}`,
      ];
      if (rateLimit) {
        command.push(`=rate-limit=${rateLimit}`);
      }
      await api.send(command);
    } else {
      const profileId = getRouterOSId(existingProfile);
      const command = [
        '/ppp/profile/set',
        `=.id=${profileId}`,
        `=local-address=${localAddress}`,
        `=remote-address=${remoteAddress}`,
      ];
      if (rateLimit) {
        command.push(`=rate-limit=${rateLimit}`);
      } else {
        command.push('=rate-limit=');
      }
      await api.send(command);
    }
  });
}

async function deletePackageFromRouter(routerId: number, packageName: string) {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    return;
  }

  return withRouterApi(routerId, async (api: RouterOSApi) => {
    const profiles = await api.send(['/ppp/profile/print', `?name=${packageName}`]);
    const existingProfile = profiles[0] ?? null;
    if (existingProfile) {
      const profileId = getRouterOSId(existingProfile);
      await api.send(['/ppp/profile/remove', `=.id=${profileId}`]);
    }
  });
}

async function syncPackageToAllRouters(pkg: { name: string; uploadSpeed: number; downloadSpeed: number }) {
  const routers = await prismaClient.router.findMany();
  for (const router of routers) {
    if (isSimulation(router)) {
      continue;
    }
    try {
      await syncPackageToRouter(router.id, pkg);
    } catch (err: any) {
      console.warn(`[Mikrotik Sync Warning] Failed to sync package '${pkg.name}' to router '${router.name}' (ID: ${router.id}): ${err.message}`);
    }
  }
}

async function deletePackageFromAllRouters(packageName: string) {
  const routers = await prismaClient.router.findMany();
  for (const router of routers) {
    if (isSimulation(router)) {
      continue;
    }
    try {
      await deletePackageFromRouter(router.id, packageName);
    } catch (err: any) {
      console.warn(`[Mikrotik Sync Warning] Failed to delete package profile '${packageName}' from router '${router.name}' (ID: ${router.id}): ${err.message}`);
    }
  }
}

async function syncAllPackagesToRouter(routerId: number) {
  const router = await getRouter(routerId);
  if (isSimulation(router)) {
    return;
  }
  const packages = await prismaClient.package.findMany();
  for (const pkg of packages) {
    try {
      await syncPackageToRouter(routerId, pkg);
    } catch (err: any) {
      console.warn(`[Mikrotik Sync Warning] Failed to sync package '${pkg.name}' to router '${router.name}' (ID: ${router.id}): ${err.message}`);
    }
  }
}

async function syncAllPackagesToAllRouters() {
  const routers = await prismaClient.router.findMany();
  const packages = await prismaClient.package.findMany();

  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  for (const router of routers) {
    if (isSimulation(router)) {
      continue;
    }
    // Test connection first to avoid long timeouts
    try {
      await withRouterApi(router.id, async (api: RouterOSApi) => {
        await api.send(['/system/identity/print']);
      });
    } catch (err: any) {
      failureCount += packages.length;
      errors.push(`Router '${router.name}' tidak dapat terhubung: ${err.message}`);
      continue;
    }

    for (const pkg of packages) {
      try {
        await syncPackageToRouter(router.id, pkg);
        successCount++;
      } catch (err: any) {
        failureCount++;
        errors.push(`Router '${router.name}', Paket '${pkg.name}': ${err.message}`);
      }
    }
  }

  return { successCount, failureCount, errors };
}

export default {
  addPppSecret,
  updatePppProfile,
  disablePppSecret,
  enablePppSecret,
  getActiveUsers,
  testConnection,
  createPppSecret,
  syncPackageToAllRouters,
  deletePackageFromAllRouters,
  syncAllPackagesToRouter,
  syncAllPackagesToAllRouters,
};
