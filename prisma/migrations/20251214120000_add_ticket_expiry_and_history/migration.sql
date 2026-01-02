-- CreateEnum
CREATE TYPE "public"."TicketPaymentStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."TicketHistoryActor" AS ENUM ('SYSTEM', 'ADMIN', 'TECHNICIAN', 'CUSTOMER');

-- AlterTable
ALTER TABLE "public"."TicketCategory" ADD COLUMN     "isExpirable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."TicketCategory" ADD COLUMN     "expireHours" INTEGER;

-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "paymentStatus" "public"."TicketPaymentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT';
ALTER TABLE "public"."Ticket" ADD COLUMN     "expiresAt" TIMESTAMP(3);
ALTER TABLE "public"."Ticket" ADD COLUMN     "expiredAt" TIMESTAMP(3);
ALTER TABLE "public"."Ticket" ADD COLUMN     "paidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."TicketHistory" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "actorType" "public"."TicketHistoryActor" NOT NULL DEFAULT 'SYSTEM',
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketHistory_ticketId_idx" ON "public"."TicketHistory"("ticketId");

-- AddForeignKey
ALTER TABLE "public"."TicketHistory" ADD CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketHistory" ADD CONSTRAINT "TicketHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
