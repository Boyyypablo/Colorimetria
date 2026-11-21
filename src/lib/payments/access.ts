import { prisma } from "@/lib/db/prisma";
import { paymentsEnabled } from "@/lib/payments/config";

export type AnalysisAccessState =
  | "unlocked"
  | "needs_retake"
  | "payment_required";

type PhotoQualityLike = {
  qualityBand?: string | null;
  faceDetected?: boolean | null;
  warnings?: string[];
  failedTips?: string[];
} | null;

export function photoNeedsRetake(photoQuality: unknown): boolean {
  const q = photoQuality as PhotoQualityLike;
  if (!q || typeof q !== "object") return false;
  if (q.qualityBand === "ruim") return true;
  if (q.faceDetected === false) return true;
  return false;
}

export function evaluateAnalysisAccess(input: {
  paymentsOn: boolean;
  hasPaidAnalysis: boolean;
  hasPaidReview: boolean;
  photoQuality: unknown;
}): AnalysisAccessState {
  if (!input.paymentsOn) return "unlocked";
  if (input.hasPaidAnalysis || input.hasPaidReview) return "unlocked";
  if (photoNeedsRetake(input.photoQuality)) return "needs_retake";
  return "payment_required";
}

export async function resolveAnalysisAccess(input: {
  analysisId: string;
  userId: string;
  photoQuality: unknown;
}): Promise<{
  state: AnalysisAccessState;
  hasPaidAnalysis: boolean;
  hasPaidReview: boolean;
  paymentsOn: boolean;
}> {
  const paymentsOn = paymentsEnabled();
  if (!paymentsOn) {
    return {
      state: "unlocked",
      hasPaidAnalysis: false,
      hasPaidReview: false,
      paymentsOn: false,
    };
  }

  const orders = await prisma.paymentOrder.findMany({
    where: {
      userId: input.userId,
      analysisId: input.analysisId,
      status: "PAID",
    },
    select: { sku: true },
  });

  const hasPaidAnalysis = orders.some((o) => o.sku === "ANALYSIS");
  const hasPaidReview = orders.some((o) => o.sku === "REVIEW");

  const state = evaluateAnalysisAccess({
    paymentsOn,
    hasPaidAnalysis,
    hasPaidReview,
    photoQuality: input.photoQuality,
  });

  return { state, hasPaidAnalysis, hasPaidReview, paymentsOn };
}

export async function getUserUnlockedAnalysisIds(
  userId: string,
): Promise<Set<string>> {
  const orders = await prisma.paymentOrder.findMany({
    where: {
      userId,
      status: "PAID",
      analysisId: { not: null },
    },
    select: { analysisId: true },
  });
  return new Set(
    orders.map((o) => o.analysisId).filter((id): id is string => Boolean(id)),
  );
}
