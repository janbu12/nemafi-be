-- Create TicketSurvey table for survey planning & actual usage
CREATE TABLE "TicketSurvey" (
    "id" SERIAL NOT NULL,
    "surveyTicketId" INTEGER NOT NULL,
    "installationTicketId" INTEGER,
    "plannedItems" JSONB NOT NULL,
    "actualItems" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSurvey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketSurvey_surveyTicketId_key" ON "TicketSurvey"("surveyTicketId");
CREATE UNIQUE INDEX "TicketSurvey_installationTicketId_key" ON "TicketSurvey"("installationTicketId");

ALTER TABLE "TicketSurvey" ADD CONSTRAINT "TicketSurvey_surveyTicketId_fkey"
FOREIGN KEY ("surveyTicketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketSurvey" ADD CONSTRAINT "TicketSurvey_installationTicketId_fkey"
FOREIGN KEY ("installationTicketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
