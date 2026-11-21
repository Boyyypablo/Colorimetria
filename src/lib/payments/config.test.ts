import { afterEach, describe, expect, it } from "vitest";
import {
  formatBrlFromCents,
  paymentsEnabled,
  priceCentsForSku,
  publicPaymentsConfig,
} from "@/lib/payments/config";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("payments config", () => {
  it("paymentsEnabled só com true literal", () => {
    process.env.PAYMENTS_ENABLED = "true";
    expect(paymentsEnabled()).toBe(true);
    process.env.PAYMENTS_ENABLED = "false";
    expect(paymentsEnabled()).toBe(false);
    delete process.env.PAYMENTS_ENABLED;
    expect(paymentsEnabled()).toBe(false);
  });

  it("preços default 67 / 129", () => {
    delete process.env.ASAAS_ANALYSIS_PRICE_CENTS;
    delete process.env.ASAAS_REVIEW_PRICE_CENTS;
    expect(priceCentsForSku("ANALYSIS")).toBe(6700);
    expect(priceCentsForSku("REVIEW")).toBe(12900);
  });

  it("respeita env de preço", () => {
    process.env.ASAAS_ANALYSIS_PRICE_CENTS = "9900";
    expect(priceCentsForSku("ANALYSIS")).toBe(9900);
  });

  it("formata BRL", () => {
    expect(formatBrlFromCents(6700)).toMatch(/67/);
  });

  it("publicPaymentsConfig não vaza secrets", () => {
    process.env.PAYMENTS_ENABLED = "true";
    process.env.ASAAS_API_KEY = "secret-should-not-appear";
    const cfg = publicPaymentsConfig();
    expect(cfg.enabled).toBe(true);
    expect(JSON.stringify(cfg)).not.toContain("secret-should-not-appear");
  });
});
