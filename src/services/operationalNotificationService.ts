import { Role } from '@prisma/client';
import pushSubscriptionService from './pushSubscriptionService.js';

function notifyRouterStatus(routerId: number, routerName: string, status: 'online' | 'offline') {
  pushSubscriptionService.notifyAsync(
    { roles: [Role.TECHNICIAN] },
    {
      title: status === 'online' ? 'Router kembali online' : 'Router offline',
      body: `Router ${routerName} terdeteksi ${status}.`,
      url: `/technician/router/${routerId}`,
      tag: `router-${status}-${routerId}`,
      data: {
        type: `router-${status}`,
        routerId,
        status,
      },
    }
  );
}

export default {
  notifyRouterStatus,
};
