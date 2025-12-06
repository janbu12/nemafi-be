/*
  Warnings:

  - A unique constraint covering the columns `[midtransTransactionId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[midtransOrderId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "midtransOrderId" TEXT,
ADD COLUMN     "midtransTransactionId" TEXT,
ADD COLUMN     "redirectUrl" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Order_midtransTransactionId_key" ON "public"."Order"("midtransTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_midtransOrderId_key" ON "public"."Order"("midtransOrderId");
