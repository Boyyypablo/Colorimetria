-- CreateTable
CREATE TABLE "AnalysisEntitlement" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sku" TEXT NOT NULL DEFAULT 'resultado-completo',
    "paymentRef" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "priceCents" INTEGER NOT NULL DEFAULT 9700,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisEntitlement_analysisId_key" ON "AnalysisEntitlement"("analysisId");

-- CreateIndex
CREATE INDEX "AnalysisEntitlement_userId_createdAt_idx" ON "AnalysisEntitlement"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisEntitlement_paymentStatus_idx" ON "AnalysisEntitlement"("paymentStatus");

-- AddForeignKey
ALTER TABLE "AnalysisEntitlement" ADD CONSTRAINT "AnalysisEntitlement_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
