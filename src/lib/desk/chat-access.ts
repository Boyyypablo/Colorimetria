import { prisma } from "@/lib/db/prisma";
import { paymentsEnabled } from "@/lib/payments/config";

export const CHAT_TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

export type ChatAccessReason =
  | "trial"
  | "paid"
  | "expired"
  | "analysis_unpaid"
  | "payments_off";

export type ChatAccess = {
  canSend: boolean;
  reason: ChatAccessReason;
  trialEndsAt: string | null;
  daysLeft: number;
};

export function describeChatAccess(input: {
  analysisPaidAt: Date | null;
  reviewPaid: boolean;
  paymentsOn: boolean;
  now?: Date;
}): ChatAccess {
  const now = input.now ?? new Date();

  if (!input.paymentsOn) {
    return {
      canSend: true,
      reason: "payments_off",
      trialEndsAt: null,
      daysLeft: 0,
    };
  }

  if (input.reviewPaid) {
    const ends = input.analysisPaidAt
      ? new Date(input.analysisPaidAt.getTime() + CHAT_TRIAL_MS)
      : null;
    return {
      canSend: true,
      reason: "paid",
      trialEndsAt: ends ? ends.toISOString() : null,
      daysLeft: 0,
    };
  }

  if (!input.analysisPaidAt) {
    return {
      canSend: false,
      reason: "analysis_unpaid",
      trialEndsAt: null,
      daysLeft: 0,
    };
  }

  const ends = new Date(input.analysisPaidAt.getTime() + CHAT_TRIAL_MS);
  const remaining = ends.getTime() - now.getTime();
  const inTrial = remaining > 0;
  const daysLeft = inTrial
    ? Math.max(1, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
    : 0;

  if (inTrial) {
    return {
      canSend: true,
      reason: "trial",
      trialEndsAt: ends.toISOString(),
      daysLeft,
    };
  }

  return {
    canSend: false,
    reason: "expired",
    trialEndsAt: ends.toISOString(),
    daysLeft: 0,
  };
}

export async function resolveChatAccess(
  userId: string,
  analysisId?: string,
): Promise<ChatAccess> {
  const paymentsOn = paymentsEnabled();
  if (!paymentsOn) {
    return describeChatAccess({
      analysisPaidAt: null,
      reviewPaid: false,
      paymentsOn: false,
    });
  }

  const [reviewOrder, analysisOrder] = await Promise.all([
    prisma.paymentOrder.findFirst({
      where: {
        userId,
        sku: "REVIEW",
        status: "PAID",
        ...(analysisId ? { analysisId } : {}),
      },
      orderBy: { paidAt: "desc" },
      select: { id: true },
    }),
    prisma.paymentOrder.findFirst({
      where: {
        userId,
        sku: "ANALYSIS",
        status: "PAID",
        ...(analysisId ? { analysisId } : {}),
      },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true, updatedAt: true },
    }),
  ]);

  const analysisPaidAt = analysisOrder
    ? analysisOrder.paidAt ?? analysisOrder.updatedAt
    : null;

  return describeChatAccess({
    analysisPaidAt,
    reviewPaid: Boolean(reviewOrder),
    paymentsOn,
  });
}
