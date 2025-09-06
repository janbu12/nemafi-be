import { prismaClient } from '../application/prisma.js';
import { assignTicketValidation, createTicketValidation, updateTicketStatusValidation } from '../validation/ticketValidation.js';
import { User } from '@prisma/client';

// Untuk Admin: Membuat tiket untuk order tertentu
async function createTicket(data: any) {
  const { orderId, title, description } = createTicketValidation.parse(data);

  const order = await prismaClient.order.findUnique({ where: { id: orderId } });
  if (!order) throw { status: 404, message: 'Order not found' };

  return prismaClient.ticket.create({
    data: { orderId, title, description },
  });
}

// Untuk Admin: Menugaskan teknisi ke tiket
async function assignTicket(ticketId: number, data: any) {
  const { technicianId } = assignTicketValidation.parse(data);

  const technician = await prismaClient.user.findFirst({
    where: { id: technicianId, role: 'TECHNICIAN' },
  });
  if (!technician) throw { status: 404, message: 'Technician not found' };

  return prismaClient.ticket.update({
    where: { id: ticketId },
    data: { technicianId },
  });
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
  
    return prismaClient.ticket.update({
      where: { id: ticketId },
      data: { status },
    });
}

// Untuk Admin: Melihat semua tiket
async function getAllTickets() {
  return prismaClient.ticket.findMany({
    include: { order: { include: { user: true } }, technician: true },
  });
}

// Untuk Teknisi: Melihat tiket yang ditugaskan kepadanya
async function getMyTickets(technician: User) {
    return prismaClient.ticket.findMany({
        where: { technicianId: technician.id },
        include: { order: { include: { user: true } } },
    });
}


export default {
  createTicket,
  assignTicket,
  updateStatus,
  getAllTickets,
  getMyTickets
};