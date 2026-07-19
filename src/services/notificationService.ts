import { Prisma, Role } from '@prisma/client';
import { prismaClient } from '../application/prisma.js';
import { emitNotificationCountUpdated, emitNotificationCreated } from '../application/socket.js';

type NotificationPayload = {
  title: string;
  message: string;
  type: string;
  url?: string;
  data?: Prisma.InputJsonValue;
};

type TargetOptions = {
  userIds?: number[];
  roles?: Role[];
};

async function resolveTargetUserIds(options: TargetOptions) {
  const userIds = new Set<number>(options.userIds ?? []);

  if (options.roles?.length) {
    const users = await prismaClient.user.findMany({
      where: { role: { in: options.roles } },
      select: { id: true },
    });
    users.forEach((user) => userIds.add(user.id));
  }

  return Array.from(userIds);
}

async function getUnreadCount(userId: number) {
  return prismaClient.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

async function list(userId: number, limit = 20) {
  return prismaClient.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50),
  });
}

async function createForTargets(options: TargetOptions, payload: NotificationPayload) {
  const targetUserIds = await resolveTargetUserIds(options);
  if (targetUserIds.length === 0) return [];

  const notifications = await Promise.all(
    targetUserIds.map((userId) =>
      prismaClient.notification.create({
        data: {
          userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          url: payload.url,
          data: payload.data,
        },
      })
    )
  );

  await Promise.all(
    notifications.map(async () => {
      emitNotificationCreated({ type: 'created' });
      emitNotificationCountUpdated({ type: 'count-updated' });
    })
  );

  return notifications;
}

async function markAsRead(userId: number, id: number) {
  const notification = await prismaClient.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    throw { status: 404, message: 'Notification not found' };
  }

  const updated = notification.readAt
    ? notification
    : await prismaClient.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });

  emitNotificationCountUpdated({ type: 'count-updated' });

  return updated;
}

async function markAllAsRead(userId: number) {
  await prismaClient.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  emitNotificationCountUpdated({ type: 'count-updated' });

  return { unreadCount: 0 };
}

export default {
  createForTargets,
  getUnreadCount,
  list,
  markAsRead,
  markAllAsRead,
  resolveTargetUserIds,
};
