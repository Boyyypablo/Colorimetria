import type { PaymentSku } from "@prisma/client";

/** Feature flag — com false, gates liberam (dev/demo). */
export function paymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "true";
}

export function asaasBaseUrl(): string {
  return (
    process.env.ASAAS_BASE_URL?.replace(/\/$/, "") ||
    "https://sandbox.asaas.com/api/v3"
  );
}

export function asaasApiKey(): string | null {
  const key = process.env.ASAAS_API_KEY?.trim();
  return key || null;
}

export function asaasWebhookToken(): string | null {
  const token = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  return token || null;
}

export function priceCentsForSku(sku: PaymentSku): number {
  if (sku === "ANALYSIS") {
    const n = Number(process.env.ASAAS_ANALYSIS_PRICE_CENTS ?? "6700");
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 6700;
  }
  const n = Number(process.env.ASAAS_REVIEW_PRICE_CENTS ?? "12900");
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 12900;
}

export function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function publicPaymentsConfig() {
  return {
    enabled: paymentsEnabled(),
    analysisPriceCents: priceCentsForSku("ANALYSIS"),
    reviewPriceCents: priceCentsForSku("REVIEW"),
    analysisPriceLabel: formatBrlFromCents(priceCentsForSku("ANALYSIS")),
    reviewPriceLabel: formatBrlFromCents(priceCentsForSku("REVIEW")),
  };
}
