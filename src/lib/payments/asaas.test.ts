import { describe, expect, it } from "vitest";
import {
  isAsaasExpiredStatus,
  isAsaasPaidStatus,
  isValidCpfCnpjDigits,
  normalizeCpfCnpj,
} from "@/lib/payments/asaas";

describe("asaas helpers", () => {
  it("normaliza CPF", () => {
    expect(normalizeCpfCnpj("123.456.789-09")).toBe("12345678909");
  });

  it("valida tamanho CPF/CNPJ", () => {
    expect(isValidCpfCnpjDigits("12345678909")).toBe(true);
    expect(isValidCpfCnpjDigits("12345678000199")).toBe(true);
    expect(isValidCpfCnpjDigits("123")).toBe(false);
  });

  it("reconhece status pago", () => {
    expect(isAsaasPaidStatus("RECEIVED")).toBe(true);
    expect(isAsaasPaidStatus("CONFIRMED")).toBe(true);
    expect(isAsaasPaidStatus("PENDING")).toBe(false);
  });

  it("reconhece status expirado", () => {
    expect(isAsaasExpiredStatus("OVERDUE")).toBe(true);
    expect(isAsaasExpiredStatus("DELETED")).toBe(true);
    expect(isAsaasExpiredStatus("RECEIVED")).toBe(false);
  });
});
