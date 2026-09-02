import { Request, Response, NextFunction } from 'express';
import routerService from '../services/routerService.js';
import { success } from '../utils/responseHandler.js';
import mikrotikService from '../services/mikrotikService.js';
import jwt from 'jsonwebtoken';
import http from 'http';
import zlib from 'zlib';
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

async function testConnectionConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { host, user, password, portApi } = req.body;
    if (!host || !user || !password) {
      throw { status: 400, message: 'Host, user, dan password wajib diisi untuk tes koneksi.' };
    }
    const result = await mikrotikService.testConnectionConfig({
      host: host.trim(),
      user: user.trim(),
      password: password.trim(),
      portApi: portApi ? Number(portApi) : 8728,
    });
    return success(res, result, result.message);
  } catch (e) {
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

function createSsoScript(router: { name: string; username: string; password: string }) {
  const routerUser = JSON.stringify(router.username);
  const routerPass = JSON.stringify(router.password);
  const routerName = JSON.stringify(router.name);

  return `
<!-- NEMAFI WEBFIG SINGLE SIGN-ON AUTO-LOGIN INJECTION -->
<div id="nemafi-sso-toast" style="position: fixed; top: 16px; right: 16px; z-index: 999999; background: #0f172a; color: #fff; border: 1px solid #ea580c; padding: 10px 16px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 10px; transition: opacity 0.5s ease; pointer-events: none;">
  <div style="width: 10px; height: 10px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e;"></div>
  <div>
    <div style="font-weight: 700; color: #f97316;">NEMAFI SSO Auto-Login</div>
    <div style="font-size: 11px; color: #94a3b8;">Mengautentikasi ke ${router.name}...</div>
  </div>
</div>
<script>
(function() {
  var routerUser = ${routerUser};
  var routerPass = ${routerPass};
  var routerName = ${routerName};
  var attempts = 0;
  var maxAttempts = 40; // check for up to 8 seconds

  function tryAutoLogin() {
    attempts++;
    var userInput = document.querySelector('input[name="name"]') ||
                    document.getElementById('name') ||
                    document.querySelector('input[name="username"]') ||
                    document.querySelector('input[type="text"]');

    var passInput = document.querySelector('input[name="password"]') ||
                    document.getElementById('password') ||
                    document.querySelector('input[type="password"]');

    var loginBtn = document.querySelector('input[type="submit"]') ||
                   document.querySelector('button[type="submit"]') ||
                   document.querySelector('.login-btn') ||
                   document.getElementById('login');

    if (userInput && passInput) {
      userInput.value = routerUser;
      passInput.value = routerPass;

      userInput.dispatchEvent(new Event('input', { bubbles: true }));
      userInput.dispatchEvent(new Event('change', { bubbles: true }));
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('[NEMAFI SSO] Credentials autofilled for ' + routerName);

      if (loginBtn && typeof loginBtn.click === 'function') {
        setTimeout(function() {
          try {
            loginBtn.click();
            console.log('[NEMAFI SSO] Login button auto-clicked.');
            var toast = document.getElementById('nemafi-sso-toast');
            if (toast) {
              toast.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;"></div><div><div style="font-weight:700;color:#22c55e;">Terautentikasi</div><div style="font-size:11px;color:#94a3b8;">Berhasil masuk ke ' + routerName + '</div></div>';
              setTimeout(function() {
                toast.style.opacity = '0';
                setTimeout(function() { toast.remove(); }, 500);
              }, 2500);
            }
          } catch(e) {}
        }, 300);
      }
      return;
    }

    if (attempts < maxAttempts) {
      setTimeout(tryAutoLogin, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryAutoLogin);
  } else {
    tryAutoLogin();
  }
})();
</script>
`;
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

    const proxyHeaders = { ...req.headers };
    delete proxyHeaders['accept-encoding']; // Ask target router to return uncompressed HTML
    proxyHeaders.host = `${host}:${port}`;

    const proxyReq = http.request(
      {
        host,
        port,
        path: req.originalUrl,
        method: req.method,
        headers: proxyHeaders,
      },
      (proxyRes) => {
        const headers = { ...proxyRes.headers };
        const contentType = (headers['content-type'] || '').toLowerCase();
        const isHtml =
          contentType.includes('text/html') ||
          (!contentType && (req.originalUrl === '/' || req.originalUrl.startsWith('/webfig')));

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

        if (isHtml) {
          const chunks: Buffer[] = [];
          proxyRes.on('data', (chunk) => chunks.push(chunk));
          proxyRes.on('end', () => {
            let buffer = Buffer.concat(chunks);
            const encoding = headers['content-encoding'];

            if (encoding === 'gzip') {
              try { buffer = zlib.gunzipSync(buffer); } catch {}
            } else if (encoding === 'deflate') {
              try { buffer = zlib.inflateSync(buffer); } catch {}
            } else if (encoding === 'br') {
              try { buffer = zlib.brotliDecompressSync(buffer); } catch {}
            }

            let html = buffer.toString('utf-8');
            const injection = createSsoScript({
              name: router.name,
              username: router.user,
              password: router.password,
            });

            if (html.includes('</body>')) {
              html = html.replace('</body>', `${injection}</body>`);
            } else {
              html += injection;
            }

            delete headers['content-encoding'];
            headers['content-length'] = Buffer.byteLength(html, 'utf-8').toString();
            res.writeHead(proxyRes.statusCode || 200, headers);
            res.end(html);
          });
        } else {
          // Direct streaming for static assets (images, js, css, etc.)
          res.writeHead(proxyRes.statusCode || 200, headers);
          proxyRes.pipe(res, { end: true });
        }
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
  testConnectionConfig,
  addPppoeUser,
  activeUsers,
  createWebfigSession,
  webfigProxy,
};
