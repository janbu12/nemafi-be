import { Request, Response, NextFunction } from 'express';
import routerService from '../services/routerService.js';
import { success } from '../utils/responseHandler.js';
import mikrotikService from '../services/mikrotikService.js';
import jwt from 'jsonwebtoken';
import http from 'http';
import { prismaClient } from '../application/prisma.js';
import operationalNotificationService from '../services/operationalNotificationService.js';


async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await routerService.create(req.body);
    return success(res, result, 'Router created successfully', 201);
  } catch (e) {
    next(e);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await routerService.getAll();
    return success(res, result, 'List of all routers');
  } catch (e) {
    next(e);
  }
}

async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await routerService.getById(id);
    if (!result) return success(res, null, 'Router not found', 404);
    return success(res, result, 'Router detail');
  } catch (e) {
    next(e);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await routerService.update(id, req.body);
    return success(res, result, 'Router updated successfully');
  } catch (e) {
    next(e);
  }
}

async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await routerService.remove(id);
    return success(res, null, 'Router deleted successfully', 204);
  } catch (e) {
    next(e);
  }
}

async function testConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await mikrotikService.testConnection(id);
    const router = await prismaClient.router.findUnique({ where: { id } });
    if (router) {
      operationalNotificationService.notifyRouterStatus(router.id, router.name, 'online');
    }
    return success(res, result, result.message);
  } catch (e) {
    const id = Number(req.params.id);
    const router = Number.isFinite(id) ? await prismaClient.router.findUnique({ where: { id } }).catch(() => null) : null;
    if (router) {
      operationalNotificationService.notifyRouterStatus(router.id, router.name, 'offline');
    }
    next(e);
  }
}

async function addPppoeUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { name, password, profile } = req.body;
    if (!name || !password) {
      throw { status: 400, message: 'name and password are required' };
    }
    const result = await mikrotikService.createPppSecret(id, { name, password, profile });
    return success(res, result, 'PPPoE user created');
  } catch (e) {
    next(e);
  }
}

async function activeUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await mikrotikService.getActiveUsers(id);
    return success(res, result, 'Active users');
  } catch (e) {
    next(e);
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURI(parts.join('='));
    }
  });

  return list;
}

async function createWebfigSession(req: Request, res: Response, next: NextFunction) {
  try {
    const routerId = Number(req.params.id);
    const token = (req.query.token as string) || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

    if (!token) {
      return res.status(401).send('Unauthorized: Token is missing.');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'd594d471a641ca5e2104150b5db7a15d2d98ec75e3c1ea1e1b037b4ce139ca29') as { id: number; email: string };
    } catch {
      return res.status(401).send('Unauthorized: Invalid token.');
    }

    const user = await prismaClient.user.findUnique({ where: { id: payload.id } });
    if (!user || !['TECH_ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(user.role)) {
      return res.status(403).send('Forbidden: Insufficient privileges.');
    }

    const router = await prismaClient.router.findUnique({ where: { id: routerId } });
    if (!router) {
      return res.status(404).send('Router not found.');
    }

    res.cookie('active_router_id', router.id.toString(), {
      httpOnly: true,
      maxAge: 3600 * 1000, // 1 hour
      path: '/',
      sameSite: 'lax',
    });

    return res.redirect('/webfig/');
  } catch (e) {
    next(e);
  }
}

async function webfigProxy(req: Request, res: Response) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const routerId = Number(cookies['active_router_id']);
    if (!routerId) {
      return res.status(400).send('Sesi router tidak aktif atau kedaluwarsa. Silakan buka kembali dari panel router.');
    }

    const router = await prismaClient.router.findUnique({ where: { id: routerId } });
    if (!router) {
      return res.status(404).send('Router tujuan tidak ditemukan.');
    }

    if (router.host === 'SIMULATION' || process.env.MIKROTIK_SIMULATION === 'true') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mikrotik Webfig Simulator</title>
          <style>
            body { font-family: sans-serif; background: #222; color: #fff; text-align: center; padding: 50px; }
            .box { border: 1px solid #444; padding: 30px; display: inline-block; background: #333; border-radius: 8px; }
            h1 { color: #f90; }
            p { font-size: 1.1em; }
            button { padding: 10px 20px; font-weight: bold; cursor: pointer; background: #f90; border: none; color: #222; border-radius: 4px; }
            button:hover { background: #e80; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>Mikrotik RouterOS Webfig</h1>
            <p><strong>Router:</strong> ${router.name} (ID: ${router.id})</p>
            <p><strong>Mode:</strong> SIMULATION</p>
            <p>Koneksi simulasi berhasil. Webfig asli hanya dapat diakses pada router fisik.</p>
            <button onclick="window.close()">Tutup Tab</button>
          </div>
        </body>
        </html>
      `);
    }

    const targetHost = router.host;
    const parts = targetHost.split(':');
    const host = parts[0];
    const port = parts[1] ? Number(parts[1]) : 80;

    console.log(`[Proxy Request] ${req.method} ${req.originalUrl} -> http://${host}:${port}${req.originalUrl}`);

    const proxyReq = http.request(
      {
        host,
        port,
        path: req.originalUrl,
        method: req.method,
        headers: {
          ...req.headers,
          host: `${host}:${port}`,
        },
      },
      (proxyRes) => {
        const headers = { ...proxyRes.headers };
        if (headers.location) {
          let loc = headers.location;
          if (loc.startsWith('http://') || loc.startsWith('https://')) {
            try {
              const parsedUrl = new URL(loc);
              loc = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
            } catch {
              // ignore
            }
          }
          headers.location = loc;
        }
        console.log(`[Proxy Response] ${req.method} ${req.originalUrl} -> Status: ${proxyRes.statusCode}, Location: ${headers.location || 'none'}`);
        res.writeHead(proxyRes.statusCode || 200, headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err: any) => {
      console.error(`Webfig Proxy Error: ${err.message}`);
      res.status(502).send(`Gagal terhubung ke Webfig MikroTik di ${targetHost}: ${err.message}`);
    });

    req.pipe(proxyReq, { end: true });
  } catch (e: any) {
    res.status(500).send(`Terjadi kesalahan proxy: ${e.message}`);
  }
}

export default {
  create,
  getAll,
  getById,
  update,
  remove,
  testConnection,
  addPppoeUser,
  activeUsers,
  createWebfigSession,
  webfigProxy,
};
