-- CreateEnum
CREATE TYPE "PaymentSku" AS ENUM ('ANALYSIS', 'REVIEW');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'EXPIRED', 'REFUNDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "asaasCustomerId" TEXT;

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sku" "PaymentSku" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "asaasPaymentId" TEXT,
    "asaasCustomerId" TEXT,
    "billingType" TEXT,
    "invoiceUrl" TEXT,
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "analysisId" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_asaasPaymentId_key" ON "PaymentOrder"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_sku_status_idx" ON "PaymentOrder"("userId", "sku", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_analysisId_sku_idx" ON "PaymentOrder"("analysisId", "sku");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_expiresAt_idx" ON "PaymentOrder"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
