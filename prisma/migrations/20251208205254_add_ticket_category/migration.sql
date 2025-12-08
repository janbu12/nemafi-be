-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "categoryId" INTEGER;

-- CreateTable
CREATE TABLE "public"."TicketCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketCategory_name_key" ON "public"."TicketCategory"("name");

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
