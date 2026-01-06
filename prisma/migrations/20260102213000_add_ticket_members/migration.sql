-- CreateTable
CREATE TABLE "TicketMember" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketMember_ticketId_technicianId_key" ON "TicketMember"("ticketId", "technicianId");

-- AddForeignKey
ALTER TABLE "TicketMember" ADD CONSTRAINT "TicketMember_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMember" ADD CONSTRAINT "TicketMember_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
