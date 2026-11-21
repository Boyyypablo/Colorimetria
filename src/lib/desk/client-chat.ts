import type { DeskMessageRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ClientChatMessage = {
  id: string;
  role: "user" | "consultant" | "system";
  body: string;
  createdAt: string;
};

function toClientRole(role: DeskMessageRole): ClientChatMessage["role"] {
  if (role === "CLIENT") return "user";
  if (role === "CONSULTANT") return "consultant";
  return "system";
}

export async function listClientChat(analysisId: string): Promise<ClientChatMessage[]> {
  const thread = await prisma.deskThread.findFirst({
    where: { analysisId },
    select: { id: true },
  });
  if (!thread) return [];

  const rows = await prisma.deskMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, body: true, createdAt: true },
  });

  return rows.map((row) => ({
    id: row.id,
    role: toClientRole(row.role),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Cria a thread do desk (se ainda não existe) e grava a mensagem da cliente. */
export async function postClientChat(input: {
  analysisId: string;
  userId: string;
  body: string;
}): Promise<ClientChatMessage[]> {
  const analysis = await prisma.analysis.findUnique({
    where: { id: input.analysisId },
    select: {
      season: { select: { namePt: true } },
      overrideSeason: { select: { namePt: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!analysis) throw new Error("ANALYSIS_NOT_FOUND");

  const clientLabel =
    analysis.user.name?.trim() || analysis.user.email || "Cliente";
  const seasonName =
    analysis.overrideSeason?.namePt || analysis.season?.namePt || null;

  const messages = await prisma.$transaction(async (tx) => {
    let thread = await tx.deskThread.findFirst({
      where: { analysisId: input.analysisId },
    });

    if (!thread) {
      const review = await tx.deskReview.create({
        data: {
          analysisId: input.analysisId,
          clientLabel,
          seasonName,
          status: "PENDING",
          autoReport: {
            summary: seasonName
              ? `Cliente abriu conversa sobre a cartela ${seasonName}.`
              : "Cliente abriu conversa sobre a cartela.",
            seasonName,
            tips: [],
          },
        },
      });
      thread = await tx.deskThread.create({
        data: {
          analysisId: input.analysisId,
          reviewId: review.id,
          clientLabel,
          status: "WAITING",
          unreadForConsultant: 0,
        },
      });
    }

    const msg = await tx.deskMessage.create({
      data: {
        threadId: thread.id,
        role: "CLIENT",
        body: input.body,
        authorId: input.userId,
      },
    });

    await tx.deskThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: msg.createdAt,
        unreadForConsultant: thread.unreadForConsultant + 1,
        status: "WAITING",
        archivedAt: null,
        clientLabel,
      },
    });

    return tx.deskMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, body: true, createdAt: true },
    });
  });

  return messages.map((row) => ({
    id: row.id,
    role: toClientRole(row.role),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }));
}
