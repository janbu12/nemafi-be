/*
  Warnings:

  - A unique constraint covering the columns `[xenditInvoiceId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[xenditExternalId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "paymentGateway" TEXT,
ADD COLUMN     "xenditExternalId" TEXT,
ADD COLUMN     "xenditInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_xenditInvoiceId_key" ON "public"."Order"("xenditInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_xenditExternalId_key" ON "public"."Order"("xenditExternalId");
