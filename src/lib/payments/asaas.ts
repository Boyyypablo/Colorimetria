import { asaasApiKey, asaasBaseUrl } from "@/lib/payments/config";

export type AsaasBillingType = "PIX" | "CREDIT_CARD" | "UNDEFINED";

export type AsaasCustomer = {
  id: string;
  name?: string;
  email?: string;
  cpfCnpj?: string;
};

export type AsaasPayment = {
  id: string;
  status: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  billingType?: string;
  value?: number;
  dueDate?: string;
  customer?: string;
};

export type AsaasPixQrCode = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

class AsaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "AsaasError";
  }
}

async function asaasFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const apiKey = asaasApiKey();
  if (!apiKey) {
    throw new AsaasError("ASAAS_API_KEY não configurada.", 500);
  }

  const res = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    // Nunca incluir body cru (pode trazer CPF) em message — só descrição genérica.
    const descriptions =
      typeof body === "object" &&
      body &&
      "errors" in body &&
      Array.isArray((body as { errors: { description?: string }[] }).errors)
        ? (body as { errors: { description?: string }[] }).errors
            .map((e) => e.description)
            .filter((d): d is string => Boolean(d))
        : [];
    const safe = descriptions
      .map((d) => d.replace(/\b\d{11}\b|\b\d{14}\b|\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "[doc]"))
      .join("; ");
    throw new AsaasError(safe || `Asaas HTTP ${res.status}`, res.status);
  }

  return body as T;
}

export function normalizeCpfCnpj(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidCpfCnpjDigits(digits: string): boolean {
  return digits.length === 11 || digits.length === 14;
}

/** Cria ou reutiliza customer no Asaas. */
export async function ensureAsaasCustomer(input: {
  existingId?: string | null;
  name: string;
  email: string;
  cpfCnpj: string;
}): Promise<AsaasCustomer> {
  const cpfCnpj = normalizeCpfCnpj(input.cpfCnpj);
  if (!isValidCpfCnpjDigits(cpfCnpj)) {
    throw new AsaasError("CPF/CNPJ inválido.", 400);
  }

  if (input.existingId) {
    try {
      return await asaasFetch<AsaasCustomer>(`/customers/${input.existingId}`);
    } catch {
      // cria de novo se o id sumiu no sandbox
    }
  }

  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.slice(0, 100),
      email: input.email,
      cpfCnpj,
      notificationDisabled: true,
    }),
  });
}

export async function createAsaasPayment(input: {
  customerId: string;
  valueReais: number;
  description: string;
  externalReference: string;
  billingType: AsaasBillingType;
  dueDate: string; // YYYY-MM-DD
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType,
      value: input.valueReais,
      dueDate: input.dueDate,
      description: input.description.slice(0, 500),
      externalReference: input.externalReference,
    }),
  });
}

export async function getAsaasPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export async function getAsaasPixQrCode(
  paymentId: string,
): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export function isAsaasPaidStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s === "RECEIVED" || s === "CONFIRMED" || s === "RECEIVED_IN_CASH";
}

export function isAsaasExpiredStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s === "OVERDUE" || s === "DELETED" || s === "REFUNDED";
}

export { AsaasError };
