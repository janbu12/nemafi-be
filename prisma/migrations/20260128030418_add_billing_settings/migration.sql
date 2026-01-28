-- CreateTable
CREATE TABLE "public"."BillingSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "automationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "suspendCron" TEXT NOT NULL DEFAULT '0 * * * *',
    "renewCron" TEXT NOT NULL DEFAULT '10 0 1 * *',
    "graceDays" INTEGER NOT NULL DEFAULT 3,
    "dueDays" INTEGER NOT NULL DEFAULT 7,
    "periodDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingSetting_pkey" PRIMARY KEY ("id")
);
