import { prisma } from "@/lib/db/prisma";
import { paymentsEnabled } from "@/lib/payments/config";

export const CHAT_TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

export type ChatAccessReason = "trial" | "paid" | "expired" | "payments_off";

export type ChatAccess = {
  canSend: boolean;
  reason: ChatAccessReason;
  trialEndsAt: string;
  daysLeft: number;
};

export function describeChatAccess(input: {
  createdAt: Date;
  paid: boolean;
  paymentsOn: boolean;
  now?: Date;
}): ChatAccess {
  const now = input.now ?? new Date();
  const ends = new Date(input.createdAt.getTime() + CHAT_TRIAL_MS);
  const remaining = ends.getTime() - now.getTime();
  const inTrial = remaining > 0;
  const daysLeft = inTrial ? Math.max(1, Math.ceil(remaining / (24 * 60 * 60 * 1000))) : 0;

  if (input.paid) {
    return {
      canSend: true,
      reason: "paid",
      trialEndsAt: ends.toISOString(),
      daysLeft,
    };
  }
  if (inTrial) {
    return {
      canSend: true,
      reason: "trial",
      trialEndsAt: ends.toISOString(),
      daysLeft,
    };
  }
  if (!input.paymentsOn) {
    return {
      canSend: true,
      reason: "payments_off",
      trialEndsAt: ends.toISOString(),
      daysLeft: 0,
    };
  }
  return {
    canSend: false,
    reason: "expired",
    trialEndsAt: ends.toISOString(),
    daysLeft: 0,
  };
}

export async function resolveChatAccess(userId: string): Promise<ChatAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  const createdAt = user?.createdAt ?? new Date();
  const paid = await prisma.paymentOrder.findFirst({
    where: { userId, sku: "REVIEW", status: "PAID" },
    select: { id: true },
  });
  return describeChatAccess({
    createdAt,
    paid: Boolean(paid),
    paymentsOn: paymentsEnabled(),
  });
}
