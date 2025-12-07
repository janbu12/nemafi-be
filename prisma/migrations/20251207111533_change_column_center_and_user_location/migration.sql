/*
  Warnings:

  - You are about to drop the column `latitude` on the `CoverageCheckHistory` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `CoverageCheckHistory` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `CoveredArea` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `CoveredArea` table. All the data in the column will be lost.

*/
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "public"."CoverageCheckHistory" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "userLocation" geography;

-- AlterTable
ALTER TABLE "public"."CoveredArea" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "center" geography,
ADD COLUMN     "radius_m" INTEGER DEFAULT 10000;
