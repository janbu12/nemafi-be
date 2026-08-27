import { prismaClient } from '../application/prisma.js';
import { emitBillingUpdated } from '../application/socket.js';
import mikrotikService from './mikrotikService.js';
import pushSubscriptionService from './pushSubscriptionService.js';
import cron from 'node-cron';
import { Role } from '@prisma/client';

type BillingSettingsInput = {
  automationEnabled?: boolean;
  suspendCron?: string;
  renewCron?: string;
  graceDays?: number;
  dueDays?: number;
  periodDays?: number;
};

function resolvePackageForInvoice(
  invoice: { periodStart: Date; periodEnd: Date },
  packageHistory: Array<{ startedAt: Date; endedAt: Date | null; package: any }>
) {
  if (!packageHistory || packageHistory.length === 0) return null;
  const matched = packageHistory.find((entry) => {
    const start = entry.startedAt;
    const end = entry.endedAt ?? new Date('2999-12-31');
    return start <= invoice.periodEnd && end >= invoice.periodStart;
  });
  return matched?.package || packageHistory[0]?.package || null;
}

function resolvePackageFromOrders(
  invoice: { periodStart: Date; periodEnd: Date },
  orders: Array<{ createdAt: Date; items: Array<{ package: any }> }>
) {
  if (!orders || orders.length === 0) return null;
  const matchedOrder =
    orders.find((order) => order.createdAt >= invoice.periodStart && order.createdAt <= invoice.periodEnd) ||
    orders[0];
  return matchedOrder?.items?.[0]?.package || null;
}

async function markLatestInvoicePaid(userId: number) {
  const invoice = await prismaClient.billingInvoice.findFirst({
    where: { userId, status: { in: ['UNPAID', 'OVERDUE'] } },
    orderBy: { dueAt: 'desc' },
  });

  if (!invoice) return null;

  await prismaClient.billingInvoice.update({
    where: { id: invoice.id },
    data: { status: 'PAID', paidAt: new Date() },
  });
  emitBillingUpdated({ userId, invoiceId: invoice.id, type: 'paid' });
  pushSubscriptionService.notifyAsync(
    { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN] },
    {
      title: 'Pembayaran berhasil',
      body: `Pembayaran invoice #${invoice.id} telah diterima.`,
      url: `/admin/transactions/${invoice.id}`,
      tag: `invoice-paid-${invoice.id}`,
      data: { type: 'billing-paid', invoiceId: invoice.id, userId },
    }
  );
  pushSubscriptionService.notifyAsync(
    { userIds: [userId] },
    {
      title: 'Pembayaran berhasil',
      body: `Pembayaran invoice #${invoice.id} telah diterima.`,
      url: '/dashboard/billing',
      tag: `invoice-paid-customer-${invoice.id}`,
      data: { type: 'billing-paid-customer', invoiceId: invoice.id, userId },
    }
  );

  const profile = await prismaClient.profile.findUnique({ where: { user_id: userId } });
  if (profile && !profile.isPppActive) {
    await prismaClient.profile.update({
      where: { id: profile.id },
      data: { isPppActive: true },
    });
    if (profile.pppUsername && profile.routerId) {
      try {
        await mikrotikService.enablePppSecret(profile.pppUsername, profile.routerId);
      } catch (err: any) {
        console.warn(`[Mikrotik Reactivate Warning] Failed to reactivate PPP secret on router: ${err.message}`);
      }
    }
  }

  const lastSuspension = await prismaClient.suspensionHistory.findFirst({
    where: { userId, resumedAt: null },
    orderBy: { suspendedAt: 'desc' },
  });
  if (lastSuspension) {
    await prismaClient.suspensionHistory.update({
      where: { id: lastSuspension.id },
      data: { resumedAt: new Date() },
    });
    pushSubscriptionService.notifyAsync(
      { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN] },
      {
        title: 'Layanan direaktivasi',
        body: `Layanan pelanggan #${userId} aktif kembali setelah pembayaran.`,
        url: `/admin/customers/${userId}`,
        tag: `service-reactivated-${userId}`,
        data: { type: 'service-reactivated', userId },
      }
    );
    pushSubscriptionService.notifyAsync(
      { userIds: [userId] },
      {
        title: 'Layanan aktif kembali',
        body: 'Layanan internet Anda telah diaktifkan kembali setelah pembayaran.',
        url: '/dashboard/billing',
        tag: `service-reactivated-customer-${userId}`,
        data: { type: 'service-reactivated-customer', userId },
      }
    );
  }

  return invoice;
}

async function listInvoices() {
  const invoices = await prismaClient.billingInvoice.findMany({
    orderBy: { dueAt: 'desc' },
    include: {
      user: {
        include: {
          profile: true,
          packageHistory: { include: { package: true }, orderBy: { startedAt: 'desc' } },
          orders: {
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { package: true } } },
          },
        },
      },
    },
  });

  return invoices.map((invoice) => ({
    ...invoice,
    package:
      resolvePackageForInvoice(invoice, invoice.user.packageHistory as any) ||
      resolvePackageFromOrders(invoice, (invoice.user.orders as any) ?? []),
  }));
}

async function getInvoiceById(id: number) {
  const invoice = await prismaClient.billingInvoice.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          profile: true,
          packageHistory: { include: { package: true }, orderBy: { startedAt: 'desc' } },
          orders: {
            orderBy: { createdAt: 'desc' },
            include: {
              items: { include: { package: true } },
              tickets: {
                include: {
                  category: true,
                  surveyRecord: true,
                  installationSurvey: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!invoice) return null;
  const tickets = invoice.user.orders?.flatMap((order) => order.tickets) ?? [];
  const surveyCandidates = tickets.flatMap((ticket) => {
    const records: Array<{ ticket: typeof ticket; record: any }> = [];
    if (ticket.surveyRecord) records.push({ ticket, record: ticket.surveyRecord });
    if (ticket.installationSurvey) records.push({ ticket, record: ticket.installationSurvey });
    return records;
  });
  const periodStart = new Date(invoice.periodStart);
  const periodEnd = new Date(invoice.periodEnd);
  const surveyInPeriod = surveyCandidates.filter(({ record }) => {
    const createdAt = new Date(record.createdAt);
    return createdAt >= periodStart && createdAt <= periodEnd;
  });
  const latestSurvey = surveyCandidates.reduce(
    (latest, current) => {
      if (!latest) return current;
      const latestDate = new Date(latest.record.updatedAt ?? latest.record.createdAt).getTime();
      const currentDate = new Date(current.record.updatedAt ?? current.record.createdAt).getTime();
      return currentDate > latestDate ? current : latest;
    },
    null as null | { ticket: (typeof tickets)[number]; record: any }
  );
  return {
    ...invoice,
    package:
      resolvePackageForInvoice(invoice, invoice.user.packageHistory as any) ||
      resolvePackageFromOrders(invoice, (invoice.user.orders as any) ?? []),
    surveyInfo: surveyInPeriod.length > 0
      ? {
          ticketId: surveyInPeriod[surveyInPeriod.length - 1].ticket.id,
          category: surveyInPeriod[surveyInPeriod.length - 1].ticket.category?.name ?? null,
          plannedItems: surveyInPeriod[surveyInPeriod.length - 1].record.plannedItems ?? [],
          actualItems: surveyInPeriod[surveyInPeriod.length - 1].record.actualItems ?? [],
          notes: surveyInPeriod[surveyInPeriod.length - 1].record.notes ?? null,
          updatedAt: surveyInPeriod[surveyInPeriod.length - 1].record.updatedAt,
          createdAt: surveyInPeriod[surveyInPeriod.length - 1].record.createdAt,
        }
      : null,
  };
}

async function applyOverdueSuspension(graceDays = 0) {
  const now = new Date();
  const overdueThreshold = new Date(now.getTime() - Math.max(0, graceDays) * 24 * 60 * 60 * 1000);

  const overdueInvoices = await prismaClient.billingInvoice.findMany({
    where: {
      status: 'UNPAID',
      dueAt: { lt: overdueThreshold },
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (overdueInvoices.length === 0) {
    return { updated: 0, userCount: 0, invoiceIds: [] };
  }

  const userIds = Array.from(new Set(overdueInvoices.map((invoice) => invoice.userId)));

  await prismaClient.billingInvoice.updateMany({
    where: { id: { in: overdueInvoices.map((invoice) => invoice.id) } },
    data: { status: 'OVERDUE' },
  });

  emitBillingUpdated({ type: 'overdue', invoiceIds: overdueInvoices.map((invoice) => invoice.id) });

  pushSubscriptionService.notifyAsync(
    { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN] },
    {
      title: 'Tagihan jatuh tempo',
      body: `${overdueInvoices.length} tagihan telah melewati jatuh tempo (Tutup Buku).`,
      url: '/admin/transactions',
      tag: 'billing-overdue',
      data: { type: 'billing-overdue', invoiceIds: overdueInvoices.map((invoice) => invoice.id) },
    }
  );

  overdueInvoices.forEach((invoice) => {
    pushSubscriptionService.notifyAsync(
      { userIds: [invoice.userId] },
      {
        title: 'Tagihan jatuh tempo',
        body: `Invoice #${invoice.id} telah melewati batas jatuh tempo. Layanan sementara diisolir.`,
        url: '/dashboard/billing',
        tag: `billing-overdue-customer-${invoice.id}`,
        data: { type: 'billing-overdue-customer', invoiceId: invoice.id, userId: invoice.userId },
      }
    );
  });

  for (const userId of userIds) {
    const profile = await prismaClient.profile.findUnique({ where: { user_id: userId } });
    if (profile && profile.isPppActive) {
      await prismaClient.profile.update({
        where: { id: profile.id },
        data: { isPppActive: false },
      });
      if (profile.pppUsername && profile.routerId) {
        try {
          await mikrotikService.disablePppSecret(profile.pppUsername, profile.routerId);
        } catch (err: any) {
          console.warn(`[Mikrotik Suspend Warning] Failed to suspend PPP secret on router: ${err.message}`);
        }
      }
    }

    const openSuspension = await prismaClient.suspensionHistory.findFirst({
      where: { userId, resumedAt: null },
    });
    if (!openSuspension) {
      await prismaClient.suspensionHistory.create({
        data: {
          userId,
          reason: 'Tagihan menunggak melewati batas jatuh tempo (Tutup Buku)',
          suspendedAt: now,
        },
      });
      pushSubscriptionService.notifyAsync(
        { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN] },
        {
          title: 'Layanan disuspend otomatis',
          body: `Layanan pelanggan #${userId} diisolir karena melewati batas jatuh tempo.`,
          url: `/admin/customers/${userId}`,
          tag: `service-suspended-${userId}`,
          data: { type: 'service-suspended', userId },
        }
      );
      pushSubscriptionService.notifyAsync(
        { userIds: [userId] },
        {
          title: 'Layanan diisolir',
          body: 'Layanan internet Anda dinonaktifkan sementara karena tagihan melewati batas jatuh tempo. Silakan lakukan pembayaran untuk membuka isolir otomatis.',
          url: '/dashboard/billing',
          tag: `service-suspended-customer-${userId}`,
          data: { type: 'service-suspended-customer', userId },
        }
      );
    }
  }

  return { updated: overdueInvoices.length, userCount: userIds.length, invoiceIds: overdueInvoices.map((i) => i.id) };
}

async function generateMonthlyInvoices() {
  const now = new Date();
  const settings = await getBillingSettings();
  const activePackages = await prismaClient.packageHistory.findMany({
    where: { endedAt: null },
    include: { user: true, package: true },
  });

  let created = 0;

  for (const active of activePackages) {
    const lastInvoice = await prismaClient.billingInvoice.findFirst({
      where: { userId: active.userId },
      orderBy: { periodEnd: 'desc' },
    });

    if (lastInvoice) {
      if (['UNPAID', 'OVERDUE'].includes(lastInvoice.status)) {
        continue;
      }
      if (now < lastInvoice.periodEnd) {
        continue;
      }
    }

    // Determine period: 1st of month to end of month
    const startYear = now.getFullYear();
    const startMonth = now.getMonth();
    const periodStart = lastInvoice ? new Date(lastInvoice.periodEnd) : new Date(startYear, startMonth, 1, 0, 0, 0);
    const lastDayOfMonth = new Date(startYear, startMonth + 1, 0, 23, 59, 59);
    const periodEnd = lastDayOfMonth;

    const dueDay = Math.min(Math.max(1, settings.dueDays || 20), lastDayOfMonth.getDate());
    const dueAt = new Date(startYear, startMonth, dueDay, 23, 59, 59);

    const invoice = await prismaClient.billingInvoice.create({
      data: {
        userId: active.userId,
        amount: active.package?.price ?? 0,
        periodStart,
        periodEnd,
        dueAt,
        status: 'UNPAID',
      },
    });

    pushSubscriptionService.notifyAsync(
      { userIds: [active.userId] },
      {
        title: 'Tagihan baru diterbitkan',
        body: `Tagihan periode ${periodStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} telah tersedia. Batas bayar tgl ${dueDay}.`,
        url: '/dashboard/billing',
        tag: `billing-new-${invoice.id}`,
        data: { type: 'billing-new', invoiceId: invoice.id, userId: active.userId },
      }
    );
    created += 1;
  }

  if (created > 0) {
    emitBillingUpdated({ type: 'renew', created });
  }
  return { created };
}

async function getBillingSettings() {
  const settings = await prismaClient.billingSetting.findUnique({ where: { id: 1 } });
  if (settings) return settings;
  return prismaClient.billingSetting.create({
    data: {
      id: 1,
      automationEnabled: false,
      suspendCron: '0 * * * *',
      renewCron: '10 0 1 * *',
      graceDays: 3,
      dueDays: 7,
      periodDays: 30,
    },
  });
}

async function updateBillingSettings(input: BillingSettingsInput) {
  const current = await getBillingSettings();
  if (input.suspendCron && !cron.validate(input.suspendCron)) {
    throw { status: 400, message: 'Format cron suspend tidak valid.' };
  }
  if (input.renewCron && !cron.validate(input.renewCron)) {
    throw { status: 400, message: 'Format cron perpanjang tidak valid.' };
  }
  return prismaClient.billingSetting.update({
    where: { id: current.id },
    data: {
      automationEnabled: input.automationEnabled ?? current.automationEnabled,
      suspendCron: input.suspendCron ?? current.suspendCron,
      renewCron: input.renewCron ?? current.renewCron,
      graceDays: typeof input.graceDays === 'number' ? input.graceDays : current.graceDays,
      dueDays: typeof input.dueDays === 'number' ? input.dueDays : current.dueDays,
      periodDays: typeof input.periodDays === 'number' ? input.periodDays : current.periodDays,
    },
  });
}

async function changeUserPackage(userId: number, packageId: number) {
  const pkg = await prismaClient.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw { status: 404, message: 'Paket tidak ditemukan.' };

  const latestInvoice = await prismaClient.billingInvoice.findFirst({
    where: { userId },
    orderBy: { periodEnd: 'desc' },
  });

  const activeHistory = await prismaClient.packageHistory.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  const profile = await prismaClient.profile.findUnique({ where: { user_id: userId } });
  const router = profile?.routerId
    ? await prismaClient.router.findUnique({ where: { id: profile.routerId } })
    : null;
  const isSimulation =
    process.env.MIKROTIK_SIMULATION === 'true' || (router?.host === 'SIMULATION');

  if (!latestInvoice || latestInvoice.status !== 'PAID') {
    if (latestInvoice) {
      await prismaClient.billingInvoice.update({
        where: { id: latestInvoice.id },
        data: { amount: pkg.price },
      });
    }

    const latestOrder = await prismaClient.order.findFirst({
      where: { userId, status: { in: ['PENDING_REVIEW', 'REVIEW_APPROVED'] } },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    if (latestOrder?.items?.[0]) {
      await prismaClient.orderItem.update({
        where: { id: latestOrder.items[0].id },
        data: { packageId: pkg.id },
      });
      await prismaClient.order.update({
        where: { id: latestOrder.id },
        data: { total: pkg.price },
      });
    }

    if (activeHistory) {
      if (activeHistory.packageId !== pkg.id) {
        await prismaClient.packageHistory.update({
          where: { id: activeHistory.id },
          data: { endedAt: new Date(), reason: 'Perubahan paket langsung (sebelum bayar)' },
        });
        await prismaClient.packageHistory.create({
          data: {
            userId,
            packageId: pkg.id,
            startedAt: new Date(),
            reason: 'Perubahan paket langsung (sebelum bayar)',
          },
        });
      }
    }

    if (profile?.isPppActive) {
      await prismaClient.profile.update({
        where: { id: profile.id },
        data: { pppProfile: pkg.name },
      });
      if (profile.pppUsername && profile.routerId && !isSimulation) {
        try {
          await mikrotikService.updatePppProfile(profile.pppUsername, profile.routerId, pkg.name);
        } catch {
          // abaikan jika gagal koneksi mikrotik
        }
      }
    }

    return { mode: 'langsung', package: pkg };
  }

  const scheduledAt = latestInvoice.periodEnd;

  if (activeHistory) {
    if (activeHistory.packageId !== pkg.id) {
      await prismaClient.packageHistory.update({
        where: { id: activeHistory.id },
        data: { endedAt: scheduledAt, reason: 'Perubahan paket periode berikutnya (setelah bayar)' },
      });
      await prismaClient.packageHistory.create({
        data: {
          userId,
          packageId: pkg.id,
          startedAt: scheduledAt,
          reason: 'Perubahan paket periode berikutnya (setelah bayar)',
        },
      });
    }
  } else {
    await prismaClient.packageHistory.create({
      data: {
        userId,
        packageId: pkg.id,
        startedAt: scheduledAt,
        reason: 'Perubahan paket periode berikutnya (setelah bayar)',
      },
    });
  }

  return { mode: 'berikutnya', package: pkg, effectiveAt: scheduledAt };
}

async function updateInvoiceStatus(id: number, status: 'PAID' | 'UNPAID' | 'OVERDUE') {
  const invoice = await prismaClient.billingInvoice.findUnique({
    where: { id },
    include: { user: { include: { profile: true } } },
  });
  if (!invoice) return null;

  const now = new Date();
  const updatedInvoice = await prismaClient.billingInvoice.update({
    where: { id },
    data: {
      status,
      paidAt: status === 'PAID' ? now : null,
    },
  });

  const userId = invoice.userId;
  const profile = invoice.user?.profile;

  if (profile) {
    if (status === 'OVERDUE') {
      await prismaClient.profile.update({
        where: { id: profile.id },
        data: { isPppActive: false },
      });
      if (profile.pppUsername && profile.routerId) {
        try {
          await mikrotikService.disablePppSecret(profile.pppUsername, profile.routerId);
        } catch (err: any) {
          console.warn(`[Mikrotik Suspend Warning] Failed to suspend PPP secret on router: ${err.message}`);
        }
      }
      const openSuspension = await prismaClient.suspensionHistory.findFirst({
        where: { userId, resumedAt: null },
      });
      if (!openSuspension) {
        await prismaClient.suspensionHistory.create({
          data: {
            userId,
            reason: 'Tagihan menunggak (diubah secara manual/simulasi oleh admin)',
            suspendedAt: now,
          },
        });
        pushSubscriptionService.notifyAsync(
          { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN] },
          {
            title: 'Layanan disuspend',
            body: `Layanan pelanggan #${userId} diisolasi karena status invoice OVERDUE.`,
            url: `/admin/customers/${userId}`,
            tag: `service-suspended-${userId}`,
            data: { type: 'service-suspended', userId, invoiceId: id },
          }
        );
        pushSubscriptionService.notifyAsync(
          { userIds: [userId] },
          {
            title: 'Layanan disuspend',
            body: 'Layanan internet Anda sementara dinonaktifkan karena status tagihan overdue.',
            url: '/dashboard/billing',
            tag: `service-suspended-customer-${userId}-${id}`,
            data: { type: 'service-suspended-customer', userId, invoiceId: id },
          }
        );
      }
    } else if (status === 'PAID') {
      await prismaClient.profile.update({
        where: { id: profile.id },
        data: { isPppActive: true },
      });
      if (profile.pppUsername && profile.routerId) {
        try {
          await mikrotikService.enablePppSecret(profile.pppUsername, profile.routerId);
        } catch (err: any) {
          console.warn(`[Mikrotik Reactivate Warning] Failed to reactivate PPP secret on router: ${err.message}`);
        }
      }
      const openSuspension = await prismaClient.suspensionHistory.findFirst({
        where: { userId, resumedAt: null },
      });
      if (openSuspension) {
        await prismaClient.suspensionHistory.update({
          where: { id: openSuspension.id },
          data: { resumedAt: now },
        });
        pushSubscriptionService.notifyAsync(
          { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN] },
          {
            title: 'Layanan direaktivasi',
            body: `Layanan pelanggan #${userId} aktif kembali.`,
            url: `/admin/customers/${userId}`,
            tag: `service-reactivated-${userId}`,
            data: { type: 'service-reactivated', userId, invoiceId: id },
          }
        );
        pushSubscriptionService.notifyAsync(
          { userIds: [userId] },
          {
            title: 'Layanan aktif kembali',
            body: 'Layanan internet Anda telah diaktifkan kembali.',
            url: '/dashboard/billing',
            tag: `service-reactivated-customer-${userId}-${id}`,
            data: { type: 'service-reactivated-customer', userId, invoiceId: id },
          }
        );
      }
    } else if (status === 'UNPAID') {
      await prismaClient.profile.update({
        where: { id: profile.id },
        data: { isPppActive: true },
      });
      if (profile.pppUsername && profile.routerId) {
        try {
          await mikrotikService.enablePppSecret(profile.pppUsername, profile.routerId);
        } catch (err: any) {
          console.warn(`[Mikrotik Reactivate Warning] Failed to reactivate PPP secret on router: ${err.message}`);
        }
      }
      const openSuspension = await prismaClient.suspensionHistory.findFirst({
        where: { userId, resumedAt: null },
      });
      if (openSuspension) {
        await prismaClient.suspensionHistory.update({
          where: { id: openSuspension.id },
          data: { resumedAt: now },
        });
      }
    }
  }

  emitBillingUpdated({ type: 'status_updated', invoiceIds: [id] });
  pushSubscriptionService.notifyAsync(
    { userIds: [userId] },
    {
      title: 'Status tagihan diperbarui',
      body: `Status invoice #${id} berubah menjadi ${status}.`,
      url: '/dashboard/billing',
      tag: `invoice-status-customer-${id}-${status}`,
      data: { type: 'invoice-status-updated', invoiceId: id, status, userId },
    }
  );

  return updatedInvoice;
}

export default {
  markLatestInvoicePaid,
  listInvoices,
  getInvoiceById,
  applyOverdueSuspension,
  generateMonthlyInvoices,
  getBillingSettings,
  updateBillingSettings,
  changeUserPackage,
  updateInvoiceStatus,
};
