import { prismaClient } from '../application/prisma.js';
import { assignTicketValidation, completeSurveyValidation, createTicketValidation, scheduleTicketValidation, surveyActualValidation, supportTicketValidation, updateSopProgressValidation, updateSurveyValidation, updateTicketMembersValidation, updateTicketStatusValidation } from '../validation/ticketValidation.js';
import { emitTicketAssignmentUpdated, emitTicketMembersUpdated, emitTicketUpdated } from '../application/socket.js';
import { Prisma, Role, User } from '@prisma/client';
import mikrotikService from './mikrotikService.js';
import pushSubscriptionService from './pushSubscriptionService.js';

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

async function provisionPppProfileFromTicket(
  ticketId: number,
  client: Prisma.TransactionClient | typeof prismaClient = prismaClient
) {
  const ticket = await client.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: true,
      order: {
        include: {
          items: { include: { package: true } },
          user: { include: { profile: true } },
        },
      },
    },
  });

  if (!ticket || ticket.category?.name !== 'instalasi') return;
  const profile = ticket.order.user.profile;
  if (!profile) return;

  const pkg = ticket.order.items[0]?.package;
  const pppUsername = profile.pppUsername || `ppp-${ticket.order.user.id}`;
  const pppPassword = profile.pppPassword || `ppp-${ticket.order.user.id}-pass`;
  const pppProfile = profile.pppProfile || pkg?.name || 'Default';

  // Update profile status in database first
  const updatedProfile = await client.profile.update({
    where: { id: profile.id },
    data: {
      pppUsername,
      pppPassword,
      pppProfile,
      isPppActive: true,
    },
    include: { router: true },
  });

  await addHistory(
    ticket.id,
    'PPPoE activated',
    `PPPoE ${pppUsername} aktif dengan profil ${pppProfile}`,
    undefined,
    client
  );

  // Sync to MikroTik router
  if (updatedProfile.routerId && updatedProfile.router) {
    try {
      await mikrotikService.addPppSecret(updatedProfile as any);
    } catch (err: any) {
      console.warn(`[Mikrotik Activation Warning] Failed to activate on router: ${err.message}`);
    }
  }
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
  const initialSop = (category?.requiresTechnician || category?.sopTemplate)
    ? getDefaultSopProgress(category)
    : null;

  const ticket = await prismaClient.ticket.create({
    data: {
      orderId,
      title,
      description,
      categoryId,
      expiresAt,
      sopProgress: initialSop as any,
    },
  });

  await addHistory(ticket.id, 'Ticket created', undefined, actor);
  emitTicketUpdated({ ticketId: ticket.id, type: 'created' });
  pushSubscriptionService.notifyAsync(
    { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN] },
    {
      title: 'Tiket baru',
      body: `Tiket #${ticket.id} dibuat: ${ticket.title}`,
      url: `/admin/tickets?id=${ticket.id}`,
      tag: `ticket-created-${ticket.id}`,
      data: { type: 'ticket-created', ticketId: ticket.id },
    }
  );

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

  emitTicketAssignmentUpdated({
    ticketId: ticket.id,
    leaderId: ticket.technicianId,
    type: 'assigned',
  });
  emitTicketUpdated({ ticketId: ticket.id, type: 'assigned' });
  pushSubscriptionService.notifyAsync(
    { userIds: [technician.id] },
    {
      title: 'Tiket ditugaskan',
      body: `Anda ditugaskan ke tiket #${ticket.id}.`,
      url: `/technician`,
      tag: `ticket-assigned-${ticket.id}`,
      data: { type: 'ticket-assigned', ticketId: ticket.id },
    }
  );

  return ticket;
}

async function scheduleTicket(ticketId: number, data: any, actor?: User) {
  const { technicianId, scheduledAt } = scheduleTicketValidation.parse(data);

  const existingTicket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { order: true },
  });
  if (!existingTicket) {
    throw { status: 404, message: 'Ticket not found' };
  }

  let leaderId = existingTicket.technicianId ?? null;
  if (technicianId) {
    if (leaderId && leaderId !== technicianId) {
      throw { status: 400, message: 'Leader already assigned for this ticket' };
    }
    const technician = await prismaClient.user.findFirst({
      where: { id: technicianId, role: 'TECHNICIAN' },
    });
    if (!technician) throw { status: 404, message: 'Technician not found' };
    leaderId = technicianId;
  }
  if (!leaderId) {
    throw { status: 400, message: 'Leader must be assigned before scheduling' };
  }

  const newSchedule = new Date(scheduledAt);
  const prevSchedule = existingTicket.scheduledAt;

  const ticket = await prismaClient.ticket.update({
    where: { id: ticketId },
    data: { technicianId: leaderId, scheduledAt: newSchedule, status: 'SCHEDULED' },
  });

  if (!existingTicket.technicianId) {
    const leader = await prismaClient.user.findUnique({ where: { id: leaderId } });
    if (leader) {
      await addHistory(ticket.id, 'Technician assigned', `Technician: ${leader.fullname}`, actor);
    }
  }
  if (existingTicket.status !== 'SCHEDULED') {
    await addHistory(ticket.id, 'Status changed to SCHEDULED', 'Menunggu pengerjaan teknisi', actor);
  }
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

  emitTicketAssignmentUpdated({
    ticketId: ticket.id,
    leaderId,
    type: 'scheduled',
    scheduledAt: ticket.scheduledAt,
  });
  emitTicketUpdated({ ticketId: ticket.id, type: 'scheduled' });
  pushSubscriptionService.notifyAsync(
    { userIds: [leaderId] },
    {
      title: 'Jadwal tiket diperbarui',
      body: `Tiket #${ticket.id} dijadwalkan pada ${ticket.scheduledAt?.toISOString()}.`,
      url: `/technician/schedule`,
      tag: `ticket-scheduled-${ticket.id}`,
      data: { type: 'ticket-scheduled', ticketId: ticket.id },
    }
  );
  pushSubscriptionService.notifyAsync(
    { userIds: [existingTicket.order.userId] },
    {
      title: 'Jadwal kunjungan diperbarui',
      body: `Tiket #${ticket.id} dijadwalkan pada ${ticket.scheduledAt?.toISOString()}.`,
      url: '/dashboard/support',
      tag: `ticket-scheduled-customer-${ticket.id}`,
      data: { type: 'ticket-scheduled-customer', ticketId: ticket.id, userId: existingTicket.order.userId },
    }
  );

  return ticket;
}

// Untuk Teknisi: Memperbarui status tiketnya
async function updateStatus(ticketId: number, technician: User, data: any) {
    const { status } = updateTicketStatusValidation.parse(data);
  
    const ticket = await prismaClient.ticket.findFirst({
      where: { id: ticketId, technicianId: technician.id },
      include: { category: true, order: true },
    });
  
    if (!ticket) {
      throw { status: 404, message: 'Ticket not found or you are not assigned to it' };
    }

    if (ticket.scheduledAt && ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      if (new Date() < ticket.scheduledAt) {
        throw { status: 400, message: 'Ticket cannot be started before scheduled time' };
      }
    }
  
    const updated = await prismaClient.ticket.update({
      where: { id: ticketId },
      data: { status },
    });

    await addHistory(updated.id, `Status changed to ${status}`, undefined, technician);

    if (['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      await provisionPppProfileFromTicket(updated.id);
    }

    if (['RESOLVED', 'CLOSED'].includes(status) && ticket.orderId) {
      await prismaClient.order.update({
        where: { id: ticket.orderId },
        data: { status: 'COMPLETED' },
      });
    }

    emitTicketUpdated({ ticketId: updated.id, type: 'status', status });
    pushSubscriptionService.notifyAsync(
      { userIds: [ticket.order.userId] },
      {
        title: 'Status tiket diperbarui',
        body: `Status tiket #${updated.id} berubah menjadi ${status}.`,
        url: '/dashboard/support',
        tag: `ticket-status-${updated.id}-${status}`,
        data: { type: 'ticket-status-updated', ticketId: updated.id, status, userId: ticket.order.userId },
      }
    );
    return updated;
}

// Untuk Admin: Melihat semua tiket
async function getAllTickets() {
  const tickets = await prismaClient.ticket.findMany({
    include: {
      order: { include: { user: { include: { profile: true } } } },
      technician: true,
      category: true,
      attachments: true,
    },
  });

  const updatedTickets = await Promise.all(tickets.map((ticket) => ensureTicketExpiry(ticket)));
  return updatedTickets as typeof tickets;
}

// Untuk Teknisi: Melihat tiket yang ditugaskan kepadanya
async function getMyTickets(technician: User) {
    const tickets = await prismaClient.ticket.findMany({
        where: {
          OR: [
            { technicianId: technician.id },
            { members: { some: { technicianId: technician.id } } },
          ],
        },
        include: {
          order: { include: { user: { include: { profile: true } } } },
          category: true,
          installationSurvey: true,
          technician: true,
          attachments: true,
          members: { include: { technician: true } },
          history: {
            select: { action: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
    });

    const updatedTickets = await Promise.all(tickets.map((ticket) => ensureTicketExpiry(ticket)));
    return updatedTickets.map((ticket: any) => {
      const completedEntry = ticket.history?.find((entry: any) =>
        entry.action === 'Status changed to RESOLVED' || entry.action === 'Status changed to CLOSED'
      );
      return {
        ...ticket,
        completedAt: completedEntry?.createdAt || (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? ticket.updatedAt : null),
      };
    });
}

async function createSupportTicket(user: User, data: any) {
  const validated = supportTicketValidation.parse(data);
  const order = await prismaClient.order.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!order) {
    throw { status: 400, message: 'Anda belum memiliki order aktif.' };
  }

  const category = await prismaClient.ticketCategory.findFirst({
    where: { name: 'customer' },
  });

  const ticket = await prismaClient.ticket.create({
    data: {
      orderId: order.id,
      title: validated.subject,
      description: validated.description,
      categoryId: category?.id,
      paymentStatus: 'PAID',
    },
  });

  if (validated.attachments?.length) {
    await prismaClient.ticketAttachment.createMany({
      data: validated.attachments.map((file) => ({
        ticketId: ticket.id,
        filename: file.filename,
        mimeType: file.mimeType,
        dataUrl: file.dataUrl || file.url || '',
      })),
    });
  }

  await addHistory(ticket.id, 'Ticket created', 'Tiket dukungan dibuat pelanggan', user);
  emitTicketUpdated({ ticketId: ticket.id, type: 'support-created' });
  pushSubscriptionService.notifyAsync(
    { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN] },
    {
      title: 'Tiket gangguan baru',
      body: `${user.fullname} membuat tiket: ${ticket.title}`,
      url: `/admin/tickets?id=${ticket.id}`,
      tag: `support-ticket-${ticket.id}`,
      data: { type: 'support-ticket-created', ticketId: ticket.id, userId: user.id },
    }
  );
  pushSubscriptionService.notifyAsync(
    { userIds: [user.id] },
    {
      title: 'Tiket dukungan diterima',
      body: `Tiket #${ticket.id} telah dibuat dan akan ditinjau oleh admin.`,
      url: '/dashboard/support',
      tag: `support-ticket-customer-${ticket.id}`,
      data: { type: 'support-ticket-received', ticketId: ticket.id, userId: user.id },
    }
  );

  return prismaClient.ticket.findUnique({
    where: { id: ticket.id },
    include: { attachments: true, category: true },
  });
}

async function getMySupportTickets(user: User) {
  return prismaClient.ticket.findMany({
    where: { order: { userId: user.id }, category: { name: 'customer' } },
    include: { attachments: true, category: true },
    orderBy: { createdAt: 'desc' },
  });
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
  const routerId = validated.routerId;

  const ticket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: true,
      order: { include: { user: { include: { profile: true } }, items: { include: { package: true } } } },
    },
  });

  if (!ticket) {
    throw { status: 404, message: 'Ticket not found' };
  }
  if (ticket.category?.name !== 'survey') {
    throw { status: 400, message: 'Ticket is not a survey ticket' };
  }
  if (!routerId) {
    throw { status: 400, message: 'Router wajib dipilih sebelum menyimpan survey' };
  }
  const router = await prismaClient.router.findUnique({ where: { id: routerId } });
  if (!router) {
    throw { status: 404, message: 'Router tidak ditemukan' };
  }
  const profileId = ticket.order?.user?.profile?.id;
  const existingPppProfile = ticket.order?.user?.profile?.pppProfile ?? null;
  if (!profileId) {
    throw { status: 400, message: 'Profil pelanggan belum lengkap' };
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

    const pppProfile = ticket.order.items[0]?.package?.name;
    await tx.profile.update({
      where: { id: profileId },
      data: {
        routerId,
        pppProfile: existingPppProfile || pppProfile,
      },
    });
    await addHistory(ticket.id, 'Router selected', `Router: ${router.name}`, actor, tx);

    const newInstallationTicket = await tx.ticket.create({
      data: {
        orderId: ticket.orderId,
        title: 'Tiket instalasi',
        description: 'Tiket instalasi dibuat setelah survey selesai.',
        categoryId: installationCategory?.id,
        paymentStatus: 'PAID',
        paidAt: ticket.paidAt ?? new Date(),
        technicianId: technician?.id,
        sopProgress: getDefaultSopProgress(installationCategory) as any,
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

  emitTicketUpdated({ ticketId: ticket.id, type: 'survey-completed' });
  emitTicketUpdated({ ticketId: installationTicket.id, type: 'installation-created' });
  pushSubscriptionService.notifyAsync(
    {
      roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN],
      userIds: installationTicket.technicianId ? [installationTicket.technicianId] : [],
    },
    {
      title: 'Hasil survey tersimpan',
      body: `Tiket instalasi #${installationTicket.id} dibuat dari survey #${ticket.id}.`,
      url: installationTicket.technicianId ? '/technician' : `/admin/tickets?id=${installationTicket.id}`,
      tag: `survey-completed-${ticket.id}`,
      data: {
        type: 'survey-completed',
        surveyTicketId: ticket.id,
        installationTicketId: installationTicket.id,
      },
    }
  );
  pushSubscriptionService.notifyAsync(
    { userIds: [ticket.order.userId] },
    {
      title: 'Survey selesai',
      body: `Survey layanan Anda selesai. Tiket instalasi #${installationTicket.id} telah dibuat.`,
      url: '/dashboard/support',
      tag: `survey-completed-customer-${ticket.id}`,
      data: {
        type: 'survey-completed-customer',
        surveyTicketId: ticket.id,
        installationTicketId: installationTicket.id,
        userId: ticket.order.userId,
      },
    }
  );
  return installationTicket;
}

async function reportSurveyActual(ticketId: number, technician: User, data: any) {
  const validated = surveyActualValidation.parse(data);

  const ticket = await prismaClient.ticket.findFirst({
    where: { id: ticketId, technicianId: technician.id },
    include: { category: true, order: true, attachments: true },
  });

  if (!ticket) {
    throw { status: 404, message: 'Ticket not found or you are not assigned to it' };
  }
  if (ticket.category?.name !== 'instalasi') {
    throw { status: 400, message: 'Ticket is not an installation ticket' };
  }

  const hasExistingAttachment = ticket.attachments.length > 0;
  const hasIncomingAttachment = Boolean(validated.attachments?.length);
  if (!hasExistingAttachment && !hasIncomingAttachment) {
    throw { status: 400, message: 'Dokumentasi foto wajib ditambahkan.' };
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

  if (validated.attachments?.length) {
    await prismaClient.ticketAttachment.createMany({
      data: validated.attachments.map((file) => ({
        ticketId: ticket.id,
        filename: file.filename,
        mimeType: file.mimeType,
        dataUrl: file.dataUrl || file.url || '',
      })),
    });
  }

  await addHistory(ticket.id, 'Installation usage reported', 'Penggunaan barang aktual telah dilaporkan', technician);
  emitTicketUpdated({ ticketId: ticket.id, type: 'actual-reported' });
  pushSubscriptionService.notifyAsync(
    { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN], userIds: [technician.id] },
    {
      title: 'Hasil pengerjaan dilaporkan',
      body: `Teknisi ${technician.fullname} melaporkan hasil tiket #${ticket.id}.`,
      url: `/admin/tickets?id=${ticket.id}`,
      tag: `actual-reported-${ticket.id}`,
      data: { type: 'actual-reported', ticketId: ticket.id, technicianId: technician.id },
    }
  );
  pushSubscriptionService.notifyAsync(
    { userIds: [ticket.order.userId] },
    {
      title: 'Hasil pengerjaan dilaporkan',
      body: `Teknisi telah melaporkan hasil pengerjaan tiket #${ticket.id}.`,
      url: '/dashboard/support',
      tag: `actual-reported-customer-${ticket.id}`,
      data: { type: 'actual-reported-customer', ticketId: ticket.id, userId: ticket.order.userId },
    }
  );

  return updated;
}

async function updateTicketMembers(ticketId: number, actor: User, data: any) {
  const validated = updateTicketMembersValidation.parse(data);

  const ticket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { members: true },
  });

  if (!ticket) {
    throw { status: 404, message: 'Ticket not found' };
  }
  if (ticket.technicianId !== actor.id) {
    throw { status: 403, message: 'Only the leader can update members' };
  }

  const addIds = (validated.addIds || []).filter((id) => id !== actor.id);
  const removeIds = (validated.removeIds || []).filter((id) => id !== actor.id);

  const uniqueIds = Array.from(new Set([...addIds, ...removeIds]));
  if (uniqueIds.length > 0) {
    const technicians = await prismaClient.user.findMany({
      where: { id: { in: uniqueIds }, role: 'TECHNICIAN' },
    });
    if (technicians.length !== uniqueIds.length) {
      throw { status: 400, message: 'Invalid technician id in members' };
    }
  }

  if (addIds.length > 0) {
    await prismaClient.ticketMember.createMany({
      data: addIds.map((technicianId) => ({ ticketId, technicianId })),
      skipDuplicates: true,
    });
  }

  if (removeIds.length > 0) {
    await prismaClient.ticketMember.deleteMany({
      where: {
        ticketId,
        technicianId: { in: removeIds },
      },
    });
  }

  const addedNames =
    addIds.length > 0
      ? (await prismaClient.user.findMany({ where: { id: { in: addIds } } })).map((user) => user.fullname)
      : [];
  const removedNames =
    removeIds.length > 0
      ? (await prismaClient.user.findMany({ where: { id: { in: removeIds } } })).map((user) => user.fullname)
      : [];

  if (addedNames.length > 0) {
    await addHistory(ticketId, 'Members added', `Members: ${addedNames.join(', ')}`, actor);
  }
  if (removedNames.length > 0) {
    await addHistory(ticketId, 'Members removed', `Members: ${removedNames.join(', ')}`, actor);
  }

  emitTicketMembersUpdated({
    ticketId,
    leaderId: ticket.technicianId,
    addIds,
    removeIds,
  });
  emitTicketUpdated({ ticketId, type: 'members-updated' });
  if (addIds.length > 0) {
    pushSubscriptionService.notifyAsync(
      { userIds: addIds },
      {
        title: 'Anda ditambahkan ke tiket',
        body: `Anda menjadi anggota pekerjaan tiket #${ticketId}.`,
        url: '/technician',
        tag: `ticket-member-${ticketId}`,
        data: { type: 'ticket-member-added', ticketId, technicianIds: addIds },
      }
    );
  }

  return prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { members: { include: { technician: true } } },
  });
}

async function getSurveyByTicket(ticketId: number) {
  const ticket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { category: true, order: { include: { user: { include: { profile: true } } } } },
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

  const profile = ticket.order?.user?.profile;
  return {
    ...survey,
    routerId: profile?.routerId ?? null,
  };
}

async function updateSurvey(ticketId: number, data: any, actor?: User) {
  const validated = updateSurveyValidation.parse(data);
  const routerId = validated.routerId;

  const ticket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { category: true, order: { include: { user: { include: { profile: true } } } } },
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

  if (routerId) {
    const router = await prismaClient.router.findUnique({ where: { id: routerId } });
    if (!router) {
      throw { status: 404, message: 'Router tidak ditemukan' };
    }
    const profile = ticket.order?.user?.profile;
    if (profile) {
      await prismaClient.profile.update({
        where: { id: profile.id },
        data: { routerId },
      });
      await addHistory(survey.surveyTicketId, 'Router updated', `Router: ${router.name}`, actor);
    }
  }

  await addHistory(survey.surveyTicketId, 'Survey updated', 'Rencana kebutuhan survey diperbarui', actor);
  emitTicketUpdated({ ticketId: survey.surveyTicketId, type: 'survey-updated' });

  return updated;
}

async function markTicketPaid(orderId: number) {
  const order = await prismaClient.order.findUnique({
    where: { id: orderId },
    select: { userId: true },
  });
  if (!order) throw { status: 404, message: 'Order not found' };

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
    emitTicketUpdated({ ticketId: created.id, type: 'payment-completed' });
    pushSubscriptionService.notifyAsync(
      { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN] },
      {
        title: 'Pembayaran berhasil',
        body: `Pembayaran order #${orderId} berhasil dan tiket survey #${created.id} dibuat.`,
        url: `/admin/tickets?id=${created.id}`,
        tag: `order-paid-${orderId}`,
        data: { type: 'order-paid', orderId, ticketId: created.id },
      }
    );
    pushSubscriptionService.notifyAsync(
      { userIds: [order.userId] },
      {
        title: 'Pembayaran berhasil',
        body: `Pembayaran Anda berhasil. Tiket survey #${created.id} telah dibuat.`,
        url: '/dashboard/support',
        tag: `order-paid-customer-${orderId}`,
        data: { type: 'order-paid-customer', orderId, ticketId: created.id, userId: order.userId },
      }
    );
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
  emitTicketUpdated({ ticketId: updated.id, type: 'payment-completed' });
  pushSubscriptionService.notifyAsync(
    { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN] },
    {
      title: 'Pembayaran berhasil',
      body: `Pembayaran order #${orderId} berhasil.`,
      url: `/admin/transactions/${orderId}`,
      tag: `order-paid-${orderId}`,
      data: { type: 'order-paid', orderId, ticketId: updated.id },
    }
  );

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
  emitTicketUpdated({ ticketId: surveyTicket.id, type: 'survey-created' });
  pushSubscriptionService.notifyAsync(
    { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN] },
    {
      title: 'Tiket survey baru',
      body: `Tiket survey #${surveyTicket.id} dibuat setelah pembayaran order #${orderId}.`,
      url: `/admin/tickets?id=${surveyTicket.id}`,
      tag: `survey-ticket-${surveyTicket.id}`,
      data: { type: 'survey-ticket-created', orderId, ticketId: surveyTicket.id },
    }
  );
  pushSubscriptionService.notifyAsync(
    { userIds: [order.userId] },
    {
      title: 'Pembayaran berhasil',
      body: `Pembayaran Anda berhasil. Tiket survey #${surveyTicket.id} telah dibuat.`,
      url: '/dashboard/support',
      tag: `survey-ticket-customer-${surveyTicket.id}`,
      data: { type: 'survey-ticket-created-customer', orderId, ticketId: surveyTicket.id, userId: order.userId },
    }
  );
  return surveyTicket;
}


export interface SopStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string | null;
  completedBy?: { id: number; fullname: string } | null;
  notes?: string;
}

export function getDefaultSopProgress(category?: { sopTemplate?: any } | null): SopStep[] {
  if (category?.sopTemplate && Array.isArray(category.sopTemplate) && category.sopTemplate.length > 0) {
    return category.sopTemplate.map((step: any, idx: number) => ({
      id: Number(step.id) || idx + 1,
      title: String(step.title || `Tahap ${idx + 1}`),
      description: String(step.description || ''),
      completed: false,
      completedAt: null,
      completedBy: null,
      notes: '',
    }));
  }

  return [
    {
      id: 1,
      title: 'Teknisi Menuju Lokasi',
      description: 'Tim teknisi dalam perjalanan menuju alamat pelanggan.',
      completed: false,
      completedAt: null,
      completedBy: null,
      notes: '',
    },
    {
      id: 2,
      title: 'Survei Titik & Cek Redaman ODP',
      description: 'Pemeriksaan jalur kabel optik, tiang terdekat, dan pengukuran redaman sinyal ODP.',
      completed: false,
      completedAt: null,
      completedBy: null,
      notes: '',
    },
    {
      id: 3,
      title: 'Penarikan Kabel Fiber Optic (Drop Core)',
      description: 'Penarikan dan perapihan kabel drop core dari ODP ke rumah pelanggan.',
      completed: false,
      completedAt: null,
      completedBy: null,
      notes: '',
    },
    {
      id: 4,
      title: 'Penyambungan (Splicing) & Pemasangan ONT',
      description: 'Splicing core optik, pemasangan roset, dan penempatan modem/router ONT.',
      completed: false,
      completedAt: null,
      completedBy: null,
      notes: '',
    },
    {
      id: 5,
      title: 'Aktivasi & Uji Kecepatan (Speedtest)',
      description: 'Sinkronisasi koneksi PPPoE ke MikroTik, pengujian bandwidth, dan serah terima.',
      completed: false,
      completedAt: null,
      completedBy: null,
      notes: '',
    },
  ];
}

async function updateSopProgress(ticketId: number, user: User, data: any) {
  const { stepId, completed, notes } = updateSopProgressValidation.parse(data);

  const ticket = await prismaClient.ticket.findUnique({
    where: { id: ticketId },
    include: { order: true, category: true, technician: true, members: true },
  });

  if (!ticket) {
    throw { status: 404, message: 'Ticket not found' };
  }

  const isAssignedLeader = ticket.technicianId === user.id;
  const isMember = ticket.members.some((m) => m.technicianId === user.id);
  const isAdmin = user.role === Role.TECH_ADMIN || user.role === Role.SUPER_ADMIN;

  if (!isAssignedLeader && !isMember && !isAdmin) {
    throw { status: 403, message: 'Anda tidak memiliki akses untuk memperbarui progres SOP tiket ini' };
  }

  let currentSop: SopStep[] = Array.isArray(ticket.sopProgress) && ticket.sopProgress.length > 0
    ? (ticket.sopProgress as any)
    : getDefaultSopProgress(ticket.category);

  const stepIndex = currentSop.findIndex((s) => s.id === stepId);
  if (stepIndex === -1) {
    throw { status: 400, message: `Tahapan SOP #${stepId} tidak ditemukan` };
  }

  const prevStep = currentSop[stepIndex];
  currentSop[stepIndex] = {
    ...prevStep,
    completed,
    completedAt: completed ? new Date().toISOString() : null,
    completedBy: completed ? { id: user.id, fullname: user.fullname } : null,
    notes: notes !== undefined ? notes : prevStep.notes,
  };

  await prismaClient.ticket.update({
    where: { id: ticketId },
    data: { sopProgress: currentSop as any },
  });

  const allCompleted = currentSop.every((s) => s.completed);
  if (allCompleted) {
    if (['OPEN', 'SCHEDULED', 'IN_PROGRESS'].includes(ticket.status)) {
      await prismaClient.ticket.update({
        where: { id: ticketId },
        data: { status: 'RESOLVED' },
      });
      await addHistory(ticketId, 'Status changed to RESOLVED', 'Semua tahapan SOP instalasi telah diselesaikan', user);
    }
    if (ticket.orderId) {
      await prismaClient.order.update({
        where: { id: ticket.orderId },
        data: { status: 'COMPLETED' },
      });
    }
    await provisionPppProfileFromTicket(ticketId);
  }

  const actionText = `SOP Tahap #${stepId} (${prevStep.title}): ${completed ? 'Selesai' : 'Dibatalkan'}`;
  await addHistory(
    ticketId,
    'SOP Progress Updated',
    notes ? `${actionText}. Catatan: ${notes}` : actionText,
    user
  );

  emitTicketUpdated({ ticketId, type: 'sop-progress', sopProgress: currentSop });

  if (ticket.order?.userId) {
    pushSubscriptionService.notifyAsync(
      { userIds: [ticket.order.userId] },
      {
        title: `Update Pemasangan: ${prevStep.title}`,
        body: completed
          ? `Tahap "${prevStep.title}" telah diselesaikan oleh tim teknisi.`
          : `Tahap "${prevStep.title}" diperbarui oleh tim teknisi.`,
        url: '/dashboard',
        tag: `sop-progress-${ticketId}-${stepId}`,
        data: { type: 'sop-progress-updated', ticketId, stepId, userId: ticket.order.userId },
      }
    );
  }

  return currentSop;
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
  updateTicketMembers,
  getSurveyByTicket,
  updateSurvey,
  createSupportTicket,
  getMySupportTickets,
  addHistoryEntry,
  markTicketPaid,
  updateSopProgress,
  getDefaultSopProgress,
};

