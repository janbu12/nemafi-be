-- AlterTable
ALTER TABLE "public"."TicketCategory" ADD COLUMN "sopTemplate" JSONB;

-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN "sopProgress" JSONB;
