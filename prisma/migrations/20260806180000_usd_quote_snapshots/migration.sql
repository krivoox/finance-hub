-- CreateTable
CREATE TABLE "usd_quote_snapshot" (
    "id" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'dolarapi',
    "providerUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usd_quote_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usd_quote_line" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "casa" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "buyRateScaled" INTEGER NOT NULL,
    "sellRateScaled" INTEGER NOT NULL,
    "scale" INTEGER NOT NULL DEFAULT 1000000,
    "providerUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usd_quote_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usd_quote_snapshot_asOfDate_key" ON "usd_quote_snapshot"("asOfDate");

-- CreateIndex
CREATE INDEX "usd_quote_line_casa_idx" ON "usd_quote_line"("casa");

-- CreateIndex
CREATE UNIQUE INDEX "usd_quote_line_snapshotId_casa_key" ON "usd_quote_line"("snapshotId", "casa");

-- AddForeignKey
ALTER TABLE "usd_quote_line" ADD CONSTRAINT "usd_quote_line_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "usd_quote_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
