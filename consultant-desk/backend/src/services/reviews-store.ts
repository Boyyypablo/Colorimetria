import { randomUUID } from "node:crypto";
import type { DeskReviewStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { PendingReview } from "../types/chat.js";
import { enqueueMessage, getOrCreateThread } from "./chat-queue.js";

function mapStatus(status: DeskReviewStatus): PendingReview["status"] {
  if (status === "REPORT_SENT") return "report_sent";
  if (status === "CLOSED") return "closed";
  return "pending";
}

function toPublic(
  review: {
    id: string;
    analysisId: string;
    clientLabel: string;
    seasonName: string | null;
    status: DeskReviewStatus;
    autoReport: unknown;
    createdAt: Date;
    reportSentAt: Date | null;
    assignedConsultantId: string | null;
  },
  threadId: string,
): PendingReview {
  const auto =
    review.autoReport && typeof review.autoReport === "object"
      ? (review.autoReport as PendingReview["autoReport"])
      : {
          summary: "",
          seasonName: review.seasonName,
          tips: [] as string[],
        };
  return {
    id: review.id,
    analysisId: review.analysisId,
    threadId,
    clientLabel: review.clientLabel,
    seasonName: review.seasonName,
    status: mapStatus(review.status),
    autoReport: auto,
    createdAt: review.createdAt.toISOString(),
    reportSentAt: review.reportSentAt?.toISOString() ?? null,
    assignedConsultantId: review.assignedConsultantId,
  };
}

export async function listPendingReviews(input?: {
  consultantId?: string;
}): Promise<PendingReview[]> {
  const where: Prisma.DeskReviewWhereInput = {
    status: { in: ["PENDING", "REPORT_SENT"] },
    thread: { archivedAt: null },
  };
  if (input?.consultantId) {
    where.OR = [
      { assignedConsultantId: input.consultantId },
      { assignedConsultantId: null },
    ];
  }

  const rows = await prisma.deskReview.findMany({
    where,
    include: { thread: true },
    orderBy: { createdAt: "desc" },
  });

  return rows
    .filter((r: (typeof rows)[number]) => Boolean(r.thread))
    .map((r: (typeof rows)[number]) => toPublic(r, r.thread!.id));
}

export async function getReview(
  id: string,
): Promise<PendingReview | undefined> {
  const row = await prisma.deskReview.findUnique({
    where: { id },
    include: { thread: true },
  });
  if (!row?.thread) return undefined;
  return toPublic(row, row.thread.id);
}

export async function intakeClientEvaluation(input?: {
  clientLabel?: string;
  seasonName?: string | null;
  analysisId?: string;
  assignedConsultantId?: string | null;
}): Promise<PendingReview> {
  const analysisId = input?.analysisId || `an_${randomUUID().slice(0, 8)}`;
  const clientLabel = input?.clientLabel || "Cliente Glowing";
  const seasonName = input?.seasonName ?? "Outono Suave";
  const assignedConsultantId = input?.assignedConsultantId ?? null;

  const autoReport = {
    summary: `Leitura automática sugerida: ${seasonName}. Subtom e contraste foram estimados a partir da foto enviada.`,
    seasonName,
    tips: [
      "Priorize cores de saturação média perto do rosto.",
      "Evite tons que apaguem o contraste natural.",
      "Teste batom e base alinhados à temperatura da cartela.",
    ],
  };

  const review = await prisma.deskReview.create({
    data: {
      analysisId,
      clientLabel,
      seasonName,
      status: "PENDING",
      autoReport,
      assignedConsultantId,
    },
  });

  const thread = await getOrCreateThread({
    analysisId,
    reviewId: review.id,
    clientLabel,
    assignedConsultantId,
  });

  await enqueueMessage({
    threadId: thread.id,
    role: "system",
    body: `Nova avaliação pendente de ${clientLabel} (${seasonName}).`,
  });

  await enqueueMessage({
    threadId: thread.id,
    role: "client",
    body: "Enviei minha análise. Pode me ajudar a ajustar o resultado?",
  });

  const fresh = await getReview(review.id);
  if (!fresh) throw new Error("REVIEW_CREATE_FAILED");
  return fresh;
}

export async function sendAutoReport(reviewId: string): Promise<PendingReview> {
  const review = await prisma.deskReview.findUnique({
    where: { id: reviewId },
    include: { thread: true },
  });
  if (!review?.thread) throw new Error("REVIEW_NOT_FOUND");

  const auto =
    review.autoReport && typeof review.autoReport === "object"
      ? (review.autoReport as PendingReview["autoReport"])
      : { summary: "", seasonName: review.seasonName, tips: [] as string[] };

  const lines = [
    "📄 Relatório automático da Glowing",
    auto.summary,
    "",
    "Sugestões:",
    ...auto.tips.map((t, i) => `${i + 1}. ${t}`),
  ];

  await enqueueMessage({
    threadId: review.thread.id,
    role: "system",
    body: lines.join("\n"),
  });

  const updated = await prisma.deskReview.update({
    where: { id: reviewId },
    data: {
      status: "REPORT_SENT",
      reportSentAt: new Date(),
    },
    include: { thread: true },
  });

  return toPublic(updated, updated.thread!.id);
}

