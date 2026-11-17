import type {
  DeskMessageRole,
  DeskThread,
  DeskThreadStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type {
  ChatAttachment,
  ChatMessage,
  ChatRole,
  ChatThread,
  ThreadListFilter,
} from "../types/chat.js";

function mapStatus(status: DeskThreadStatus): ChatThread["status"] {
  if (status === "WAITING") return "waiting";
  if (status === "CLOSED") return "closed";
  return "open";
}

function mapRole(role: DeskMessageRole): ChatRole {
  if (role === "CLIENT") return "client";
  if (role === "CONSULTANT") return "consultant";
  return "system";
}

function toRoleEnum(role: ChatRole): DeskMessageRole {
  if (role === "client") return "CLIENT";
  if (role === "consultant") return "CONSULTANT";
  return "SYSTEM";
}

function toPublicThread(
  row: DeskThread & {
    assignedConsultant?: { name: string | null; email: string } | null;
  },
): ChatThread {
  return {
    id: row.id,
    analysisId: row.analysisId,
    reviewId: row.reviewId,
    clientLabel: row.clientLabel,
    status: mapStatus(row.status),
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    unreadForConsultant: row.unreadForConsultant,
    assignedConsultantId: row.assignedConsultantId,
    assignedConsultantName:
      row.assignedConsultant?.name?.trim() ||
      row.assignedConsultant?.email ||
      null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

function toPublicMessage(row: {
  id: string;
  threadId: string;
  role: DeskMessageRole;
  body: string;
  createdAt: Date;
  attachments: unknown;
  externalLinks: unknown;
}): ChatMessage {
  const attachments = Array.isArray(row.attachments)
    ? (row.attachments as ChatAttachment[])
    : undefined;
  const externalLinks = Array.isArray(row.externalLinks)
    ? (row.externalLinks as string[])
    : undefined;
  return {
    id: row.id,
    threadId: row.threadId,
    role: mapRole(row.role),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    attachments,
    externalLinks,
  };
}

export async function listThreads(input?: {
  filter?: ThreadListFilter;
  consultantId?: string;
}): Promise<ChatThread[]> {
  const filter = input?.filter || "active";
  const where: {
    archivedAt?: null | { not: null };
    unreadForConsultant?: { gt: number } | number;
    status?: DeskThreadStatus;
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (filter === "active") {
    where.archivedAt = null;
  } else if (filter === "archived") {
    where.archivedAt = { not: null };
  } else if (filter === "unread") {
    where.archivedAt = null;
    where.unreadForConsultant = { gt: 0 };
  } else if (filter === "answered") {
    where.archivedAt = null;
    where.unreadForConsultant = 0;
    where.status = "OPEN";
  }
  // "all" → sem filtro de arquivo

  if (input?.consultantId && filter !== "all" && filter !== "archived") {
    where.OR = [
      { assignedConsultantId: input.consultantId },
      { assignedConsultantId: null },
    ];
  }

  const rows = await prisma.deskThread.findMany({
    where,
    include: {
      assignedConsultant: { select: { name: true, email: true } },
    },
    orderBy: [{ unreadForConsultant: "desc" }, { lastMessageAt: "desc" }],
  });
  return rows.map(toPublicThread);
}

export async function getOrCreateThread(input: {
  analysisId: string;
  reviewId: string;
  clientLabel: string;
  assignedConsultantId?: string | null;
}): Promise<ChatThread> {
  const existing = await prisma.deskThread.findFirst({
    where: { analysisId: input.analysisId },
    include: {
      assignedConsultant: { select: { name: true, email: true } },
    },
  });
  if (existing) return toPublicThread(existing);

  const row = await prisma.deskThread.create({
    data: {
      analysisId: input.analysisId,
      reviewId: input.reviewId,
      clientLabel: input.clientLabel,
      status: "OPEN",
      assignedConsultantId: input.assignedConsultantId ?? null,
      unreadForConsultant: 0,
    },
    include: {
      assignedConsultant: { select: { name: true, email: true } },
    },
  });
  return toPublicThread(row);
}

export async function getThread(
  threadId: string,
): Promise<ChatThread | undefined> {
  const row = await prisma.deskThread.findUnique({
    where: { id: threadId },
    include: {
      assignedConsultant: { select: { name: true, email: true } },
    },
  });
  return row ? toPublicThread(row) : undefined;
}

export async function getMessages(
  threadId: string,
  after?: string,
): Promise<ChatMessage[]> {
  const list = await prisma.deskMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });
  if (!after) return list.map(toPublicMessage);
  const idx = list.findIndex((m: { id: string }) => m.id === after);
  return (idx >= 0 ? list.slice(idx + 1) : list).map(toPublicMessage);
}

export async function enqueueMessage(input: {
  threadId: string;
  body: string;
  role: ChatRole;
  attachments?: ChatAttachment[];
  externalLinks?: string[];
  authorId?: string | null;
}): Promise<ChatMessage> {
  const thread = await prisma.deskThread.findUnique({
    where: { id: input.threadId },
  });
  if (!thread) throw new Error("THREAD_NOT_FOUND");

  const msg = await prisma.deskMessage.create({
    data: {
      threadId: input.threadId,
      role: toRoleEnum(input.role),
      body: input.body,
      attachments: input.attachments ?? undefined,
      externalLinks: input.externalLinks ?? undefined,
      authorId: input.authorId ?? null,
    },
  });

  const unread =
    input.role === "client"
      ? thread.unreadForConsultant + 1
      : input.role === "consultant"
        ? 0
        : thread.unreadForConsultant;
  const status: DeskThreadStatus =
    input.role === "client"
      ? "WAITING"
      : input.role === "consultant"
        ? "OPEN"
        : thread.status;

  await prisma.deskThread.update({
    where: { id: input.threadId },
    data: {
      lastMessageAt: msg.createdAt,
      unreadForConsultant: unread,
      status,
    },
  });

  const publicMsg = toPublicMessage(msg);
  publishToThread(input.threadId, "message", publicMsg);
  return publicMsg;
}

export async function markThreadRead(threadId: string): Promise<void> {
  await prisma.deskThread.updateMany({
    where: { id: threadId },
    data: { unreadForConsultant: 0 },
  });
}

/** Arquiva — nunca apaga. Some da lista ativa. */
export async function archiveThread(threadId: string): Promise<ChatThread> {
  const row = await prisma.deskThread.update({
    where: { id: threadId },
    data: { archivedAt: new Date() },
    include: {
      assignedConsultant: { select: { name: true, email: true } },
    },
  });
  const publicThread = toPublicThread(row);
  publishToThread(threadId, "thread", publicThread);
  return publicThread;
}

export async function unarchiveThread(threadId: string): Promise<ChatThread> {
  const row = await prisma.deskThread.update({
    where: { id: threadId },
    data: { archivedAt: null },
    include: {
      assignedConsultant: { select: { name: true, email: true } },
    },
  });
  const publicThread = toPublicThread(row);
  publishToThread(threadId, "thread", publicThread);
  return publicThread;
}

export async function transferThread(input: {
  threadId: string;
  fromConsultantId: string;
  toConsultantId: string;
  note?: string | null;
}): Promise<ChatThread> {
  const to = await prisma.user.findFirst({
    where: {
      id: input.toConsultantId,
      role: { in: ["CONSULTANT", "ADMIN"] },
    },
  });
  if (!to) throw new Error("TARGET_NOT_FOUND");

  const thread = await prisma.deskThread.findUnique({
    where: { id: input.threadId },
  });
  if (!thread) throw new Error("THREAD_NOT_FOUND");
  if (thread.archivedAt) throw new Error("THREAD_ARCHIVED");

  await prisma.$transaction([
    prisma.deskThreadTransfer.create({
      data: {
        threadId: input.threadId,
        fromConsultantId: input.fromConsultantId,
        toConsultantId: input.toConsultantId,
        note: input.note?.trim() || null,
      },
    }),
    prisma.deskThread.update({
      where: { id: input.threadId },
      data: {
        assignedConsultantId: input.toConsultantId,
        // Desarquiva se estava ativa; mantém unread para a nova consultora
      },
    }),
    prisma.deskReview.updateMany({
      where: { id: thread.reviewId },
      data: { assignedConsultantId: input.toConsultantId },
    }),
  ]);

  const toName = to.name?.trim() || to.email;
  await enqueueMessage({
    threadId: input.threadId,
    role: "system",
    body: input.note?.trim()
      ? `Conversa encaminhada para ${toName}. Nota: ${input.note.trim()}`
      : `Conversa encaminhada para ${toName}.`,
    authorId: input.fromConsultantId,
  });

  const updated = await getThread(input.threadId);
  if (!updated) throw new Error("THREAD_NOT_FOUND");
  return updated;
}

export type SseClient = { write: (chunk: string) => void; close: () => void };

const sseByThread = new Map<string, Set<SseClient>>();

export function subscribeThread(
  threadId: string,
  client: SseClient,
): () => void {
  let set = sseByThread.get(threadId);
  if (!set) {
    set = new Set();
    sseByThread.set(threadId, set);
  }
  set.add(client);
  return () => {
    set!.delete(client);
  };
}

export function publishToThread(
  threadId: string,
  event: string,
  data: unknown,
): void {
  const set = sseByThread.get(threadId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of set) {
    try {
      c.write(payload);
    } catch {
      set.delete(c);
    }
  }
}
