-- CreateTable
CREATE TABLE "public"."CoveredArea" (
    "id" SERIAL NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoveredArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoverageCheckHistory" (
    "id" SERIAL NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "isCovered" BOOLEAN NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoverageCheckHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoveredArea_province_city_district_village_key" ON "public"."CoveredArea"("province", "city", "district", "village");
