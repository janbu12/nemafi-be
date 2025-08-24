-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CUSTOMER', 'TECHNICIAN', 'TECH_ADMIN');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'CUSTOMER';
