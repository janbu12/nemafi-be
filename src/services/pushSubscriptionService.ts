import webPush from 'web-push';
import { Role } from '@prisma/client';
import { prismaClient } from '../application/prisma.js';
import { env } from '../config/env.js';
import notificationService from './notificationService.js';
import {
  pushSubscriptionValidation,
  unsubscribePushValidation,
} from '../validation/pushSubscriptionValidation.js';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

type NotifyOptions = {
  roles?: Role[];
  userIds?: number[];
};

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return false;
  }

  webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

function toWebPushSubscription(subscription: {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dhKey,
      auth: subscription.authKey,
    },
  };
}

function getPublicKey() {
  return {
    publicKey: env.VAPID_PUBLIC_KEY || '',
    enabled: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
  };
}

async function subscribe(userId: number, input: unknown) {
  const data = pushSubscriptionValidation.parse(input);

  return prismaClient.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: {
      userId,
      endpoint: data.endpoint,
      p256dhKey: data.keys.p256dh,
      authKey: data.keys.auth,
      userAgent: data.userAgent,
    },
    update: {
      userId,
      p256dhKey: data.keys.p256dh,
      authKey: data.keys.auth,
      userAgent: data.userAgent,
    },
  });
}

async function unsubscribe(userId: number, input: unknown) {
  const data = unsubscribePushValidation.parse(input);
  await prismaClient.pushSubscription.deleteMany({
    where: {
      endpoint: data.endpoint,
      userId,
    },
  });
  return { endpoint: data.endpoint };
}

async function findTargetUserIds(options: NotifyOptions) {
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

async function notify(options: NotifyOptions, payload: PushPayload) {
  const targetUserIds = await findTargetUserIds(options);
  if (targetUserIds.length === 0) {
    return { sent: 0, failed: 0, skipped: false };
  }

  await notificationService.createForTargets(
    { userIds: targetUserIds },
    {
      title: payload.title,
      message: payload.body,
      type: String(payload.data?.type || payload.tag || 'general'),
      url: payload.url || '/',
      data: payload.data as any,
    }
  );

  if (!configureVapid()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const subscriptions = await prismaClient.pushSubscription.findMany({
    where: { userId: { in: targetUserIds } },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: false };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag,
    data: payload.data || {},
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(toWebPushSubscription(subscription), body);
        sent += 1;
      } catch (error: any) {
        failed += 1;
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await prismaClient.pushSubscription.delete({
            where: { id: subscription.id },
          }).catch(() => undefined);
        }
      }
    })
  );

  return { sent, failed, skipped: false };
}

function notifyAsync(options: NotifyOptions, payload: PushPayload) {
  void notify(options, payload).catch((error) => {
    console.warn('[web-push] notification failed:', error?.message || error);
  });
}

export default {
  getPublicKey,
  subscribe,
  unsubscribe,
  notify,
  notifyAsync,
};
