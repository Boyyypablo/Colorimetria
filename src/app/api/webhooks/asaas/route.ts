import { NextResponse } from "next/server";
import { asaasWebhookToken } from "@/lib/payments/config";
import { applyAsaasPaymentStatus } from "@/lib/payments/orders";

export const runtime = "nodejs";

/**
 * Webhook Asaas — configure no painel com o mesmo ASAAS_WEBHOOK_TOKEN
 * (header `asaas-access-token` ou query `?token=`).
 *
 * Eventos tratados: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE,
 * PAYMENT_DELETED, PAYMENT_REFUNDED.
 */
export async function POST(request: Request) {
  const expected = asaasWebhookToken();
  if (!expected) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const headerToken =
    request.headers.get("asaas-access-token") ||
    request.headers.get("Asaas-Access-Token") ||
    "";
  const urlToken = new URL(request.url).searchParams.get("token") || "";
  const token = headerToken || urlToken;
  if (token !== expected) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: {
    event?: string;
    payment?: {
      id?: string;
      status?: string;
      externalReference?: string;
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const payment = body.payment;
  if (!payment?.id || !payment.status) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const event = (body.event || "").toUpperCase();
  const relevant =
    event.includes("PAYMENT_") ||
    ["RECEIVED", "CONFIRMED", "OVERDUE", "DELETED", "REFUNDED"].includes(
      payment.status.toUpperCase(),
    );
  if (!relevant) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await applyAsaasPaymentStatus(
      payment.externalReference || payment.id,
      payment.status,
      payment.id,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "[webhooks/asaas]",
      err instanceof Error ? err.message : "unknown",
    );
    // 200 para evitar retry storm em order desconhecida; loga o erro
    return NextResponse.json({ ok: true, missing: true });
  }
}
