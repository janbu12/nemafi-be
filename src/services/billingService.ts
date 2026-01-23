import { prismaClient } from '../application/prisma.js';

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

  const profile = await prismaClient.profile.findUnique({ where: { user_id: userId } });
  if (profile && !profile.isPppActive) {
    await prismaClient.profile.update({
      where: { id: profile.id },
      data: { isPppActive: true },
    });
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
  }

  return invoice;
}

async function applyOverdueSuspension(graceDays = 3) {
  const now = new Date();
  const overdueThreshold = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);

  const overdueInvoices = await prismaClient.billingInvoice.findMany({
    where: {
      status: 'UNPAID',
      dueAt: { lt: overdueThreshold },
    },
  });

  if (overdueInvoices.length === 0) return { updated: 0 };

  const userIds = Array.from(new Set(overdueInvoices.map((invoice) => invoice.userId)));

  await prismaClient.billingInvoice.updateMany({
    where: { id: { in: overdueInvoices.map((invoice) => invoice.id) } },
    data: { status: 'OVERDUE' },
  });

  for (const userId of userIds) {
    const profile = await prismaClient.profile.findUnique({ where: { user_id: userId } });
    if (profile && profile.isPppActive) {
      await prismaClient.profile.update({
        where: { id: profile.id },
        data: { isPppActive: false },
      });
    }

    const openSuspension = await prismaClient.suspensionHistory.findFirst({
      where: { userId, resumedAt: null },
    });
    if (!openSuspension) {
      await prismaClient.suspensionHistory.create({
        data: {
          userId,
          reason: 'Tagihan menunggak melebihi masa tenggang',
          suspendedAt: now,
        },
      });
    }
  }

  return { updated: overdueInvoices.length };
}

export default {
  markLatestInvoicePaid,
  applyOverdueSuspension,
};
