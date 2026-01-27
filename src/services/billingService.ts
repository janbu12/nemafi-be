import { prismaClient } from '../application/prisma.js';

function resolvePackageForInvoice(
  invoice: { periodStart: Date; periodEnd: Date },
  packageHistory: Array<{ startedAt: Date; endedAt: Date | null; package: any }>
) {
  const matched = packageHistory.find((entry) => {
    const start = entry.startedAt;
    const end = entry.endedAt ?? new Date('2999-12-31');
    return start <= invoice.periodEnd && end >= invoice.periodStart;
  });
  return matched?.package || packageHistory[0]?.package || null;
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

async function listInvoices() {
  const invoices = await prismaClient.billingInvoice.findMany({
    orderBy: { dueAt: 'desc' },
    include: {
      user: {
        include: {
          profile: true,
          packageHistory: { include: { package: true }, orderBy: { startedAt: 'desc' } },
        },
      },
    },
  });

  return invoices.map((invoice) => ({
    ...invoice,
    package: resolvePackageForInvoice(invoice, invoice.user.packageHistory as any),
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
        },
      },
    },
  });
  if (!invoice) return null;
  return {
    ...invoice,
    package: resolvePackageForInvoice(invoice, invoice.user.packageHistory as any),
  };
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
  listInvoices,
  getInvoiceById,
  applyOverdueSuspension,
};
