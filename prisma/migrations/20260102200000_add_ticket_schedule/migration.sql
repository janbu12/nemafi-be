-- Add scheduledAt to Ticket for technician scheduling
ALTER TABLE "Ticket"
ADD COLUMN "scheduledAt" TIMESTAMP(3);
