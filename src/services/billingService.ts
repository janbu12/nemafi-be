import { prismaClient } from '../application/prisma.js';

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
