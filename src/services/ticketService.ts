import { prismaClient } from '../application/prisma.js';
import { assignTicketValidation, completeSurveyValidation, createTicketValidation, scheduleTicketValidation, surveyActualValidation, updateSurveyValidation, updateTicketStatusValidation } from '../validation/ticketValidation.js';
import { Prisma, Role, User } from '@prisma/client';

type TicketHistoryActorType = 'SYSTEM' | 'ADMIN' | 'TECHNICIAN' | 'CUSTOMER';

function resolveActorType(user?: User): TicketHistoryActorType {
  if (!user) return 'SYSTEM';
  if (user.role === Role.TECHNICIAN) return 'TECHNICIAN';
  if (user.role === Role.CUSTOMER) return 'CUSTOMER';
  return 'ADMIN';
}

async function addHistory(
  ticketId: number,
  action: string,
  description?: string,
  actor?: User,
  client: Prisma.TransactionClient | typeof prismaClient = prismaClient
) {
  return client.ticketHistory.create({
    data: {
      ticketId,
      action,
      description,
      actorType: resolveActorType(actor),
      actorId: actor?.id,
    },
  });
}

async function addHistoryEntry(ticketId: number, action: string, description: string, actorId?: number) {
  const actor = actorId
    ? await prismaClient.user.findUnique({ where: { id: actorId } })
    : undefined;
  return addHistory(ticketId, action, description, actor ?? undefined);
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

async function scheduleTicket(ticketId: number, data: any, actor?: User) {
  const { technicianId, scheduledAt } = scheduleTicketValidation.parse(data);

  const existingTicket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
  });
  if (!existingTicket) {
    throw { status: 404, message: 'Ticket not found' };
  }

  const technician = await prismaClient.user.findFirst({
    where: { id: technicianId, role: 'TECHNICIAN' },
  });
  if (!technician) throw { status: 404, message: 'Technician not found' };

  const newSchedule = new Date(scheduledAt);
  const prevSchedule = existingTicket.scheduledAt;

  const ticket = await prismaClient.ticket.update({
    where: { id: ticketId },
    data: { technicianId, scheduledAt: newSchedule, status: 'IN_PROGRESS' },
  });

  await addHistory(ticket.id, 'Technician assigned', `Technician: ${technician.fullname}`, actor);
  if (prevSchedule) {
    await addHistory(
      ticket.id,
      'Schedule updated',
      `Jadwal diubah dari ${prevSchedule.toISOString()} ke ${newSchedule.toISOString()}`,
      actor
    );
  } else {
    await addHistory(
      ticket.id,
      'Schedule updated',
      `Dijadwalkan pada ${newSchedule.toISOString()}`,
      actor
    );
  }

  if (ticket.categoryId) {
    const category = await prismaClient.ticketCategory.findUnique({ where: { id: ticket.categoryId } });
    if (category?.name === 'instalasi') {
      await prismaClient.order.update({
        where: { id: ticket.orderId },
        data: { status: 'TECHNICIAN_ASSIGNED' },
      });
    }
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

async function completeSurvey(ticketId: number, data: any, actor?: User) {
  const validated = completeSurveyValidation.parse(data);
  const surveyItems = validated.items;
  const notes = validated.notes;
  const technicianId = validated.technicianId;

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

  const inventoryIds = surveyItems.map((item) => item.inventoryItemId);
  const inventoryItems = await prismaClient.inventoryItem.findMany({
    where: { id: { in: inventoryIds } },
  });

  if (inventoryItems.length !== inventoryIds.length) {
    throw { status: 400, message: 'Beberapa inventaris tidak ditemukan' };
  }

  const plannedItems = surveyItems.map((item) => {
    const inventory = inventoryItems.find((inv) => inv.id === item.inventoryItemId);
    return {
      inventoryItemId: item.inventoryItemId,
      name: inventory?.name,
      unit: inventory?.unit,
      quantity: item.quantity,
    };
  });

  const installationCategory = await prismaClient.ticketCategory.findFirst({
    where: { name: 'instalasi' },
  });

  const technician = technicianId
    ? await prismaClient.user.findFirst({ where: { id: technicianId, role: 'TECHNICIAN' } })
    : null;
  if (technicianId && !technician) {
    throw { status: 404, message: 'Technician not found' };
  }

  const installationTicket = await prismaClient.$transaction(async (tx) => {
    const existingSurvey = await tx.ticketSurvey.findUnique({
      where: { surveyTicketId: ticket.id },
    });
    if (existingSurvey) {
      if (!existingSurvey.installationTicketId) {
        throw { status: 409, message: 'Survey sudah disimpan sebelumnya' };
      }
      const existingInstallation = await tx.ticket.findUnique({
        where: { id: existingSurvey.installationTicketId },
      });
      if (!existingInstallation) {
        throw { status: 409, message: 'Survey sudah disimpan sebelumnya' };
      }
      return existingInstallation;
    }

    const updatedSurvey = await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED' },
    });
    await addHistory(updatedSurvey.id, 'Survey completed', 'Survey instalasi telah selesai', actor, tx);

    const newInstallationTicket = await tx.ticket.create({
      data: {
        orderId: ticket.orderId,
        title: 'Tiket instalasi',
        description: 'Tiket instalasi dibuat setelah survey selesai.',
        categoryId: installationCategory?.id,
        paymentStatus: 'PAID',
        paidAt: ticket.paidAt ?? new Date(),
        technicianId: technician?.id,
      },
    });

    await tx.ticketSurvey.create({
      data: {
        surveyTicketId: ticket.id,
        installationTicketId: newInstallationTicket.id,
        plannedItems,
        notes,
      },
    });

    await tx.order.update({
      where: { id: ticket.orderId },
      data: { status: technician ? 'TECHNICIAN_ASSIGNED' : 'WAITING_FOR_ASSIGNMENT' },
    });

    await addHistory(newInstallationTicket.id, 'Ticket created', 'Tiket instalasi dibuat setelah survey', actor, tx);
    await addHistory(updatedSurvey.id, 'Installation ticket created', `Tiket instalasi #${newInstallationTicket.id} dibuat`, actor, tx);
    if (technician) {
      await addHistory(newInstallationTicket.id, 'Technician assigned', `Technician: ${technician.fullname}`, actor, tx);
    }

    return newInstallationTicket;
  });

  return installationTicket;
}

async function reportSurveyActual(ticketId: number, technician: User, data: any) {
  const validated = surveyActualValidation.parse(data);

  const ticket = await prismaClient.ticket.findFirst({
    where: { id: ticketId, technicianId: technician.id },
    include: { category: true },
  });

  if (!ticket) {
    throw { status: 404, message: 'Ticket not found or you are not assigned to it' };
  }
  if (ticket.category?.name !== 'instalasi') {
    throw { status: 400, message: 'Ticket is not an installation ticket' };
  }

  const inventoryIds = validated.items.map((item) => item.inventoryItemId);
  const inventoryItems = await prismaClient.inventoryItem.findMany({
    where: { id: { in: inventoryIds } },
  });
  if (inventoryItems.length !== inventoryIds.length) {
    throw { status: 400, message: 'Beberapa inventaris tidak ditemukan' };
  }

  const actualItems = validated.items.map((item) => {
    const inventory = inventoryItems.find((inv) => inv.id === item.inventoryItemId);
    return {
      inventoryItemId: item.inventoryItemId,
      name: inventory?.name,
      unit: inventory?.unit,
      quantity: item.quantity,
    };
  });

  const surveyRecord = await prismaClient.ticketSurvey.findFirst({
    where: { installationTicketId: ticket.id },
  });
  if (!surveyRecord) {
    throw { status: 404, message: 'Survey record not found for this ticket' };
  }

  const updated = await prismaClient.ticketSurvey.update({
    where: { id: surveyRecord.id },
    data: {
      actualItems,
      notes: validated.notes ?? surveyRecord.notes,
    },
  });

  await addHistory(ticket.id, 'Installation usage reported', 'Penggunaan barang aktual telah dilaporkan', technician);

  return updated;
}

async function getSurveyByTicket(ticketId: number) {
  const ticket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { category: true },
  });

  if (!ticket) {
    throw { status: 404, message: 'Ticket not found' };
  }

  const survey = await prismaClient.ticketSurvey.findFirst({
    where: {
      OR: [
        { surveyTicketId: ticketId },
        { installationTicketId: ticketId },
      ],
    },
    include: {
      installationTicket: {
        include: { technician: true },
      },
    },
  });

  if (!survey) {
    return null;
  }

  return survey;
}

async function updateSurvey(ticketId: number, data: any, actor?: User) {
  const validated = updateSurveyValidation.parse(data);

  const ticket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { category: true },
  });
  if (!ticket) {
    throw { status: 404, message: 'Ticket not found' };
  }

  const survey = await prismaClient.ticketSurvey.findFirst({
    where: {
      OR: [
        { surveyTicketId: ticketId },
        { installationTicketId: ticketId },
      ],
    },
  });

  if (!survey) {
    throw { status: 404, message: 'Survey record not found' };
  }

  const inventoryIds = validated.items.map((item) => item.inventoryItemId);
  const inventoryItems = await prismaClient.inventoryItem.findMany({
    where: { id: { in: inventoryIds } },
  });

  if (inventoryItems.length !== inventoryIds.length) {
    throw { status: 400, message: 'Beberapa inventaris tidak ditemukan' };
  }

  const plannedItems = validated.items.map((item) => {
    const inventory = inventoryItems.find((inv) => inv.id === item.inventoryItemId);
    return {
      inventoryItemId: item.inventoryItemId,
      name: inventory?.name,
      unit: inventory?.unit,
      quantity: item.quantity,
    };
  });

  const updated = await prismaClient.ticketSurvey.update({
    where: { id: survey.id },
    data: {
      plannedItems,
      notes: validated.notes ?? survey.notes,
    },
  });

  await addHistory(survey.surveyTicketId, 'Survey updated', 'Rencana kebutuhan survey diperbarui', actor);

  return updated;
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
  scheduleTicket,
  updateStatus,
  getAllTickets,
  getMyTickets,
  getHistory,
  completeSurvey,
  reportSurveyActual,
  getSurveyByTicket,
  updateSurvey,
  addHistoryEntry,
  markTicketPaid,
};
