import type { PaymentOrder, PaymentSku } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  createAsaasPayment,
  ensureAsaasCustomer,
  getAsaasPayment,
  getAsaasPixQrCode,
  isAsaasExpiredStatus,
  isAsaasPaidStatus,
  type AsaasBillingType,
} from "@/lib/payments/asaas";
import { paymentsEnabled, priceCentsForSku } from "@/lib/payments/config";

const REUSE_WINDOW_MS = 24 * 60 * 60 * 1000;

function dueDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function skuLabel(sku: PaymentSku): string {
  return sku === "ANALYSIS" ? "Análise de colorimetria" : "Revisão com consultora";
}

export type CreatePaymentInput = {
  userId: string;
  userEmail: string;
  userName: string | null;
  asaasCustomerId: string | null;
  sku: PaymentSku;
  analysisId?: string | null;
  cpfCnpj: string;
  billingType?: AsaasBillingType;
};

export async function findReusableOrder(input: {
  userId: string;
  sku: PaymentSku;
  analysisId?: string | null;
}): Promise<PaymentOrder | null> {
  const now = new Date();

  if (input.sku === "ANALYSIS") {
    if (input.analysisId) {
      const paidForAnalysis = await prisma.paymentOrder.findFirst({
        where: {
          userId: input.userId,
          sku: "ANALYSIS",
          status: "PAID",
          analysisId: input.analysisId,
        },
        orderBy: { paidAt: "desc" },
      });
      if (paidForAnalysis) return paidForAnalysis;
    }

    const paidOrphan = await prisma.paymentOrder.findFirst({
      where: {
        userId: input.userId,
        sku: "ANALYSIS",
        status: "PAID",
        analysisId: null,
      },
      orderBy: { paidAt: "desc" },
    });
    if (paidOrphan) return paidOrphan;
  }

  if (input.sku === "REVIEW" && input.analysisId) {
    const paidReview = await prisma.paymentOrder.findFirst({
      where: {
        userId: input.userId,
        sku: "REVIEW",
        status: "PAID",
        analysisId: input.analysisId,
      },
      orderBy: { paidAt: "desc" },
    });
    if (paidReview) return paidReview;

    const openReview = await prisma.paymentOrder.findFirst({
      where: {
        userId: input.userId,
        sku: "REVIEW",
        analysisId: input.analysisId,
        status: { in: ["PENDING", "AWAITING_PAYMENT"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (openReview) return openReview;
  }

  if (input.sku === "ANALYSIS") {
    if (input.analysisId) {
      const openForAnalysis = await prisma.paymentOrder.findFirst({
        where: {
          userId: input.userId,
          sku: "ANALYSIS",
          analysisId: input.analysisId,
          status: { in: ["PENDING", "AWAITING_PAYMENT"] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "desc" },
      });
      if (openForAnalysis) return openForAnalysis;
    }

    const open = await prisma.paymentOrder.findFirst({
      where: {
        userId: input.userId,
        sku: "ANALYSIS",
        status: { in: ["PENDING", "AWAITING_PAYMENT"] },
        analysisId: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (open) return open;
  }

  return null;
}

export async function createOrReusePaymentOrder(
  input: CreatePaymentInput,
): Promise<PaymentOrder> {
  if (!paymentsEnabled()) {
    throw new Error("Pagamentos desabilitados (PAYMENTS_ENABLED).");
  }

  if (input.sku === "REVIEW") {
    if (!input.analysisId) {
      throw new Error("analysisId obrigatório para REVIEW.");
    }
  }

  const reusable = await findReusableOrder({
    userId: input.userId,
    sku: input.sku,
    analysisId: input.analysisId,
  });
  if (reusable && (reusable.status === "PAID" || reusable.invoiceUrl || reusable.pixCopyPaste)) {
    if (
      input.sku === "ANALYSIS" &&
      input.analysisId &&
      !reusable.analysisId
    ) {
      return prisma.paymentOrder.update({
        where: { id: reusable.id },
        data: { analysisId: input.analysisId },
      });
    }
    return reusable;
  }

  const amountCents = priceCentsForSku(input.sku);
  const billingType: AsaasBillingType = input.billingType || "PIX";
  const expiresAt = new Date(Date.now() + REUSE_WINDOW_MS);

  const customer = await ensureAsaasCustomer({
    existingId: input.asaasCustomerId,
    name: input.userName || input.userEmail.split("@")[0] || "Cliente",
    email: input.userEmail,
    cpfCnpj: input.cpfCnpj,
  });

  if (customer.id !== input.asaasCustomerId) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { asaasCustomerId: customer.id },
    });
  }

  const order = await prisma.paymentOrder.create({
    data: {
      userId: input.userId,
      sku: input.sku,
      amountCents,
      currency: "BRL",
      status: "PENDING",
      asaasCustomerId: customer.id,
      billingType,
      analysisId: input.analysisId ?? null,
      expiresAt,
    },
  });

  try {
    const payment = await createAsaasPayment({
      customerId: customer.id,
      valueReais: amountCents / 100,
      description: `${skuLabel(input.sku)} — Colometria`,
      externalReference: order.id,
      billingType,
      dueDate: dueDatePlusDays(1),
    });

    let pixQrCode: string | null = null;
    let pixCopyPaste: string | null = null;
    if (billingType === "PIX" || billingType === "UNDEFINED") {
      try {
        const pix = await getAsaasPixQrCode(payment.id);
        pixQrCode = pix.encodedImage || null;
        pixCopyPaste = pix.payload || null;
      } catch {
        // cartão / falha pontual de QR — invoiceUrl ainda serve
      }
    }

    return prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        asaasPaymentId: payment.id,
        status: "AWAITING_PAYMENT",
        invoiceUrl: payment.invoiceUrl || payment.bankSlipUrl || null,
        pixQrCode,
        pixCopyPaste,
      },
    });
  } catch (err) {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    throw err;
  }
}

export async function syncOrderFromAsaas(
  order: PaymentOrder,
): Promise<PaymentOrder> {
  if (!order.asaasPaymentId) return order;
  if (order.status === "PAID" || order.status === "REFUNDED") return order;

  const payment = await getAsaasPayment(order.asaasPaymentId);
  return applyAsaasPaymentStatus(order.id, payment.status, payment.id);
}

export async function applyAsaasPaymentStatus(
  orderIdOrExternalRef: string,
  asaasStatus: string,
  asaasPaymentId?: string,
): Promise<PaymentOrder> {
  const existing =
    (asaasPaymentId
      ? await prisma.paymentOrder.findUnique({ where: { asaasPaymentId } })
      : null) ||
    (await prisma.paymentOrder.findUnique({
      where: { id: orderIdOrExternalRef },
    }));

  if (!existing) {
    throw new Error("PaymentOrder não encontrada.");
  }

  return applyStatusToOrder(existing, asaasStatus, asaasPaymentId);
}

async function applyStatusToOrder(
  order: PaymentOrder,
  asaasStatus: string,
  asaasPaymentId?: string,
): Promise<PaymentOrder> {
  if (isAsaasPaidStatus(asaasStatus)) {
    if (order.status === "PAID") return order;
    return prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        ...(asaasPaymentId && !order.asaasPaymentId
          ? { asaasPaymentId }
          : {}),
      },
    });
  }

  if (asaasStatus.toUpperCase() === "REFUNDED") {
    return prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
    });
  }

  if (isAsaasExpiredStatus(asaasStatus)) {
    if (order.status === "PAID") return order;
    return prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: asaasStatus.toUpperCase() === "DELETED" ? "CANCELLED" : "EXPIRED",
      },
    });
  }

  return order;
}

/** Consome order ANALYSIS PAID sem analysisId — vincula à análise criada. */
export async function consumeAnalysisOrder(input: {
  orderId: string;
  userId: string;
  analysisId: string;
}): Promise<PaymentOrder> {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: input.orderId },
  });
  if (!order || order.userId !== input.userId) {
    throw new Error("Pedido de pagamento inválido.");
  }
  if (order.sku !== "ANALYSIS") {
    throw new Error("Pedido não é de análise.");
  }
  if (order.status !== "PAID") {
    throw new Error("Pagamento ainda não confirmado.");
  }
  if (order.analysisId && order.analysisId !== input.analysisId) {
    throw new Error("Este pagamento já foi usado em outra análise.");
  }
  if (order.analysisId === input.analysisId) return order;

  return prisma.paymentOrder.update({
    where: { id: order.id },
    data: { analysisId: input.analysisId },
  });
}

export async function assertReviewOrderPaid(input: {
  userId: string;
  analysisId: string;
  orderId?: string | null;
}): Promise<PaymentOrder | null> {
  if (!paymentsEnabled()) return null;

  const whereBase = {
    userId: input.userId,
    sku: "REVIEW" as const,
    status: "PAID" as const,
    analysisId: input.analysisId,
  };

  const order = input.orderId
    ? await prisma.paymentOrder.findFirst({
        where: { ...whereBase, id: input.orderId },
      })
    : await prisma.paymentOrder.findFirst({
        where: whereBase,
        orderBy: { paidAt: "desc" },
      });

  if (!order) {
    throw new Error("Pagamento da revisão necessário antes de solicitar.");
  }
  return order;
}

export async function assertAnalysisOrderReady(input: {
  userId: string;
  orderId: string;
}): Promise<PaymentOrder> {
  if (!paymentsEnabled()) {
    throw new Error("Pagamentos desabilitados.");
  }
  const order = await prisma.paymentOrder.findUnique({
    where: { id: input.orderId },
  });
  if (!order || order.userId !== input.userId) {
    throw new Error("Pedido de pagamento inválido.");
  }
  if (order.sku !== "ANALYSIS") {
    throw new Error("Pedido não é de análise.");
  }
  if (order.status !== "PAID") {
    throw new Error("Pagamento da análise ainda não confirmado.");
  }
  if (order.analysisId) {
    throw new Error("Este pagamento já foi usado.");
  }
  return order;
}

export function serializePaymentOrder(order: PaymentOrder) {
  return {
    id: order.id,
    sku: order.sku,
    amountCents: order.amountCents,
    currency: order.currency,
    status: order.status,
    billingType: order.billingType,
    invoiceUrl: order.invoiceUrl,
    pixQrCode: order.pixQrCode,
    pixCopyPaste: order.pixCopyPaste,
    analysisId: order.analysisId,
    paidAt: order.paidAt,
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
  };
}

export async function listUserPaymentHistory(userId: string) {
  const orders = await prisma.paymentOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const nowMs = Date.now();
  return orders.map((o) => {
    const isOpen =
      (o.status === "AWAITING_PAYMENT" || o.status === "PENDING") &&
      (!o.expiresAt || o.expiresAt.getTime() > nowMs);
    return {
      id: o.id,
      sku: o.sku,
      amountCents: o.amountCents,
      status: o.status,
      billingType: o.billingType,
      invoiceUrl: o.invoiceUrl,
      analysisId: o.analysisId,
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
      createdAt: o.createdAt.toISOString(),
      canResume: Boolean(isOpen && o.invoiceUrl),
    };
  });
}
