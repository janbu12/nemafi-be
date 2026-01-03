import { prismaClient } from '../application/prisma.js';
import { assignTicketValidation, createTicketValidation, updateTicketStatusValidation } from '../validation/ticketValidation.js';
import { Role, User } from '@prisma/client';

type TicketHistoryActorType = 'SYSTEM' | 'ADMIN' | 'TECHNICIAN' | 'CUSTOMER';

function resolveActorType(user?: User): TicketHistoryActorType {
  if (!user) return 'SYSTEM';
  if (user.role === Role.TECHNICIAN) return 'TECHNICIAN';
  if (user.role === Role.CUSTOMER) return 'CUSTOMER';
  return 'ADMIN';
}

async function addHistory(ticketId: number, action: string, description?: string, actor?: User) {
  return prismaClient.ticketHistory.create({
    data: {
      ticketId,
      action,
      description,
      actorType: resolveActorType(actor),
      actorId: actor?.id,
    },
  });
}

function getExpiryFromCategory(category?: { isExpirable: boolean; expireHours: number | null }) {
  if (!category || !category.isExpirable || !category.expireHours) return null;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + category.expireHours);
  return expiresAt;
}

async function ensureTicketExpiry(ticket: {
  id: number;
  paymentStatus: string;
  expiresAt: Date | null;
  status?: string;
  category?: { name: string } | null;
}) {
  if (!ticket.expiresAt) return ticket;
  if (ticket.paymentStatus !== 'PENDING_PAYMENT') return ticket;
  if (ticket.expiresAt.getTime() > Date.now()) return ticket;

  const shouldClose = ticket.category?.name === 'registrasi';
  await prismaClient.ticket.update({
    where: { id: ticket.id },
    data: {
      paymentStatus: 'EXPIRED',
      expiredAt: new Date(),
      ...(shouldClose ? { status: 'CLOSED' } : {}),
    },
  });
  await addHistory(ticket.id, 'Ticket expired', 'Tiket hangus karena belum dibayar', undefined);
  if (shouldClose) {
    await addHistory(ticket.id, 'Status changed to CLOSED', 'Tiket registrasi otomatis diselesaikan', undefined);
  }

  return {
    ...ticket,
    paymentStatus: 'EXPIRED',
    expiredAt: new Date(),
    ...(shouldClose ? { status: 'CLOSED' } : {}),
  } as any;
}

// Untuk Admin: Membuat tiket untuk order tertentu
async function createTicket(data: any, actor?: User) {
  const { orderId, title, description, categoryId } = createTicketValidation.parse(data);

  const order = await prismaClient.order.findUnique({ where: { id: orderId } });
  if (!order) throw { status: 404, message: 'Order not found' };

  const category = categoryId
    ? await prismaClient.ticketCategory.findUnique({ where: { id: categoryId } })
    : null;
  if (categoryId && !category) throw { status: 404, message: 'Ticket category not found' };

  const expiresAt = getExpiryFromCategory(category ?? undefined);

  const ticket = await prismaClient.ticket.create({
    data: { orderId, title, description, categoryId, expiresAt },
  });

  await addHistory(ticket.id, 'Ticket created', undefined, actor);

  return ticket;
}

// Untuk Admin: Menugaskan teknisi ke tiket
async function assignTicket(ticketId: number, data: any, actor?: User) {
  const { technicianId } = assignTicketValidation.parse(data);

  const technician = await prismaClient.user.findFirst({
    where: { id: technicianId, role: 'TECHNICIAN' },
  });
  if (!technician) throw { status: 404, message: 'Technician not found' };

  const ticket = await prismaClient.ticket.update({
    where: { id: ticketId },
    data: { technicianId },
    include: { category: true },
  });

  await addHistory(ticket.id, 'Technician assigned', `Technician: ${technician.fullname}`, actor);
  if (ticket.category?.name === 'instalasi') {
    await prismaClient.order.update({
      where: { id: ticket.orderId },
      data: { status: 'TECHNICIAN_ASSIGNED' },
    });
  }

  return ticket;
}

// Untuk Teknisi: Memperbarui status tiketnya
async function updateStatus(ticketId: number, technician: User, data: any) {
    const { status } = updateTicketStatusValidation.parse(data);
  
    const ticket = await prismaClient.ticket.findFirst({
      where: { id: ticketId, technicianId: technician.id },
    });
  
    if (!ticket) {
      throw { status: 404, message: 'Ticket not found or you are not assigned to it' };
    }
  
    const updated = await prismaClient.ticket.update({
      where: { id: ticketId },
      data: { status },
    });

    await addHistory(updated.id, `Status changed to ${status}`, undefined, technician);

    return updated;
}

// Untuk Admin: Melihat semua tiket
async function getAllTickets() {
  const tickets = await prismaClient.ticket.findMany({
    include: { order: { include: { user: true } }, technician: true, category: true },
  });

  const updatedTickets = await Promise.all(tickets.map((ticket) => ensureTicketExpiry(ticket)));
  return updatedTickets as typeof tickets;
}

// Untuk Teknisi: Melihat tiket yang ditugaskan kepadanya
async function getMyTickets(technician: User) {
    const tickets = await prismaClient.ticket.findMany({
        where: { technicianId: technician.id },
        include: { order: { include: { user: true } }, category: true },
    });

    const updatedTickets = await Promise.all(tickets.map((ticket) => ensureTicketExpiry(ticket)));
    return updatedTickets as typeof tickets;
}

async function getHistory(ticketId: number) {
  return prismaClient.ticketHistory.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'desc' },
    include: { actor: true },
  });
}

async function completeSurvey(ticketId: number, actor?: User) {
  const ticket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { category: true },
  });

  if (!ticket) {
    throw { status: 404, message: 'Ticket not found' };
  }
  if (ticket.category?.name !== 'survey') {
    throw { status: 400, message: 'Ticket is not a survey ticket' };
  }

  const updatedSurvey = await prismaClient.ticket.update({
    where: { id: ticket.id },
    data: { status: 'CLOSED' },
  });
  await addHistory(updatedSurvey.id, 'Survey completed', 'Survey instalasi telah selesai', actor);

  const installationCategory = await prismaClient.ticketCategory.findFirst({
    where: { name: 'instalasi' },
  });

  const installationTicket = await prismaClient.ticket.create({
    data: {
      orderId: ticket.orderId,
      title: 'Tiket instalasi',
      description: 'Tiket instalasi dibuat setelah survey selesai.',
      categoryId: installationCategory?.id,
      paymentStatus: 'PAID',
      paidAt: ticket.paidAt ?? new Date(),
    },
  });

  await prismaClient.order.update({
    where: { id: ticket.orderId },
    data: { status: 'WAITING_FOR_ASSIGNMENT' },
  });

  await addHistory(installationTicket.id, 'Ticket created', 'Tiket instalasi dibuat setelah survey', actor);
  await addHistory(updatedSurvey.id, 'Installation ticket created', `Tiket instalasi #${installationTicket.id} dibuat`, actor);

  return installationTicket;
}

async function markTicketPaid(orderId: number) {
  const registrationTicket = await prismaClient.ticket.findFirst({
    where: { orderId, category: { name: 'registrasi' } },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  const surveyCategory = await prismaClient.ticketCategory.findFirst({
    where: { name: 'survey' },
  });

  const existingSurvey = await prismaClient.ticket.findFirst({
    where: { orderId, category: { name: 'survey' } },
    orderBy: { createdAt: 'desc' },
  });

  if (!registrationTicket) {
    if (existingSurvey) return existingSurvey;

    const created = await prismaClient.ticket.create({
      data: {
        orderId,
        title: 'Tiket survey instalasi',
        description: 'Tiket survey dibuat setelah pembayaran berhasil untuk kebutuhan instalasi.',
        categoryId: surveyCategory?.id,
        paymentStatus: 'PAID',
        paidAt: new Date(),
      },
    });

    await addHistory(created.id, 'Ticket created', 'Tiket survey dibuat setelah pembayaran', undefined);
    await addHistory(created.id, 'Payment completed', 'Status pembayaran tiket menjadi PAID', undefined);
    return created;
  }

  await ensureTicketExpiry(registrationTicket);

  const updated = await prismaClient.ticket.update({
    where: { id: registrationTicket.id },
    data: {
      paymentStatus: 'PAID',
      paidAt: new Date(),
      ...(registrationTicket.category?.name === 'registrasi' ? { status: 'CLOSED' } : {}),
    },
  });

  await addHistory(updated.id, 'Payment completed', 'Status pembayaran tiket menjadi PAID', undefined);
  await addHistory(updated.id, 'Status changed to CLOSED', 'Tiket registrasi diselesaikan setelah pembayaran', undefined);

  if (existingSurvey) return existingSurvey;

  const surveyTicket = await prismaClient.ticket.create({
    data: {
      orderId,
      title: 'Tiket survey instalasi',
      description: 'Tiket survey dibuat setelah pembayaran berhasil untuk kebutuhan instalasi.',
      categoryId: surveyCategory?.id,
      paymentStatus: 'PAID',
      paidAt: new Date(),
    },
  });

  await addHistory(surveyTicket.id, 'Ticket created', 'Tiket survey dibuat setelah pembayaran', undefined);
  await addHistory(updated.id, 'Survey ticket created', `Tiket survey #${surveyTicket.id} dibuat`, undefined);
  return surveyTicket;
}


export default {
  createTicket,
  assignTicket,
  updateStatus,
  getAllTickets,
  getMyTickets,
  getHistory,
  completeSurvey,
  markTicketPaid,
};
