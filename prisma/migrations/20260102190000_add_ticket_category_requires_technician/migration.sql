-- Add requiresTechnician flag to ticket categories
ALTER TABLE "TicketCategory"
ADD COLUMN "requiresTechnician" BOOLEAN NOT NULL DEFAULT false;
