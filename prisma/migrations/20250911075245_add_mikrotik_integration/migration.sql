/*
  Warnings:

  - A unique constraint covering the columns `[pppUsername]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "isPppActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pppPassword" TEXT,
ADD COLUMN     "pppProfile" TEXT,
ADD COLUMN     "pppUsername" TEXT,
ADD COLUMN     "routerId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Router" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "port" INTEGER DEFAULT 8728,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Router_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Router_name_key" ON "public"."Router"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_pppUsername_key" ON "public"."Profile"("pppUsername");

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "public"."Router"("id") ON DELETE SET NULL ON UPDATE CASCADE;
