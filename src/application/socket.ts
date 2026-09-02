import { Server as IOServer } from 'socket.io';
import { Server } from 'http';
import { Client as SSHClient } from 'ssh2';
import { prismaClient } from './prisma.js';

let ioInstance: IOServer | null = null;

export function initSocket(server: Server) {
  const io = new IOServer(server, {
    cors: { origin: '*' },
    path: '/socket.io',
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client terhubung | Socket ID: ${socket.id}`);
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client terputus | Socket ID: ${socket.id} (Alasan: ${reason})`);
    });
  });

  const terminalNamespace = io.of('/terminal');

  terminalNamespace.on('connection', (socket) => {
    let ssh: SSHClient | null = null;
    let sshStream: any = null;

    socket.on('open', async (payload: { routerId?: number }) => {
      try {
        const routerId = Number(payload?.routerId);
        if (!routerId) throw new Error('routerId is required');

        const router = await prismaClient.router.findUnique({ where: { id: routerId } });
        if (!router) throw new Error('Router not found');

        ssh = new SSHClient();

        ssh
          .on('ready', () => {
            ssh?.shell((err, stream) => {
              if (err) {
                socket.emit('error', err.message);
                ssh?.end();
                return;
              }

              sshStream = stream;
              socket.emit('ready');

              stream.setEncoding('utf-8');
              stream.on('data', (data: string) => socket.emit('data', data));
              stream.stderr.on('data', (data: Buffer | string) =>
                socket.emit('data', data.toString())
              );
              stream.on('close', () => {
                socket.emit('close');
                socket.disconnect(true);
              });

              // Kick a newline to force prompt render
              stream.write('\r\n');
            });
          })
          .on('error', (err) => {
            socket.emit('error', err.message);
          })
          .on('close', () => {
            socket.emit('close');
          })
          .connect({
            host: router.host,
            port: router.portSsh ? Number(router.portSsh) : router.port || 22,
            username: router.user,
            password: router.password,
            readyTimeout: 10000,
          });
      } catch (err: any) {
        socket.emit('error', err.message || 'Failed to start terminal session');
      }
    });

    socket.on('data', (data: string) => {
      if (sshStream) {
        sshStream.write(data);
      }
    });

    socket.on('disconnect', () => {
      try {
        sshStream?.end();
        ssh?.end();
      } catch {
        // ignore
      }
      sshStream = null;
      ssh = null;
    });
  });

  return io;
}

export function emitOrderPending(payload: any) {
  if (!ioInstance) return;
  console.log(`[Socket.IO] Event dipancarkan: 'orders:pending' | Data Order #${payload?.id || payload?.orderId || ''}`);
  ioInstance.emit('orders:pending', payload);
}

export function emitOrderReviewed(payload: any) {
  if (!ioInstance) return;
  console.log(`[Socket.IO] Event dipancarkan: 'orders:reviewed' | Order #${payload?.id} Status: ${payload?.status}`);
  ioInstance.emit('orders:reviewed', payload);
}

export function emitTicketMembersUpdated(payload: any) {
  if (!ioInstance) return;
  console.log(`[Socket.IO] Event dipancarkan: 'tickets:members-updated' | Ticket #${payload?.ticketId}`);
  ioInstance.emit('tickets:members-updated', payload);
}

export function emitTicketAssignmentUpdated(payload: any) {
  if (!ioInstance) return;
  console.log(`[Socket.IO] Event dipancarkan: 'tickets:assignment-updated' | Ticket #${payload?.ticketId}`);
  ioInstance.emit('tickets:assignment-updated', payload);
}

export function emitTicketUpdated(payload: any) {
  if (!ioInstance) return;
  console.log(`[Socket.IO] Event dipancarkan: 'tickets:updated' | Ticket #${payload?.id || payload?.ticketId}`);
  ioInstance.emit('tickets:updated', payload);
}

export function emitBillingUpdated(payload: any) {
  if (!ioInstance) return;
  console.log(`[Socket.IO] Event dipancarkan: 'billing:updated' | Data:`, payload);
  ioInstance.emit('billing:updated', payload);
}

export function emitNotificationCreated(payload: any) {
  if (!ioInstance) return;
  console.log(`[Socket.IO] Event dipancarkan: 'notifications:new' | Judul: ${payload?.title}`);
  ioInstance.emit('notifications:new', payload);
}

export function emitNotificationCountUpdated(payload: any) {
  if (!ioInstance) return;
  console.log(`[Socket.IO] Event dipancarkan: 'notifications:count-updated' | Unread: ${payload?.unreadCount}`);
  ioInstance.emit('notifications:count-updated', payload);
}
