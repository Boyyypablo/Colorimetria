import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireConsultant } from "../middleware/auth.js";
import { requireTrustedOrigin } from "../middleware/csrf-origin.js";
import {
  checkPersonalContact,
  PII_USER_MESSAGE,
} from "../services/pii-filter.js";
import {
  archiveThread,
  enqueueMessage,
  getMessages,
  getThread,
  listThreads,
  markThreadRead,
  subscribeThread,
  transferThread,
  unarchiveThread,
} from "../services/chat-queue.js";
import type { ChatAttachment, ThreadListFilter } from "../types/chat.js";

const MAX_ATTACH_BYTES = 2 * 1024 * 1024;
const MAX_ATTACH_COUNT = 3;

const attachmentSchema = z.object({
  kind: z.enum(["image", "document"]),
  name: z.string().trim().min(1).max(180),
  mime: z.string().trim().min(3).max(120),
  dataUrl: z.string().min(32).max(MAX_ATTACH_BYTES * 2),
});

const postBody = z.object({
  body: z.string().trim().max(4000).default(""),
  attachments: z.array(attachmentSchema).max(MAX_ATTACH_COUNT).optional(),
});

const threadIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, "threadId inválido");

const afterSchema = z
  .string()
  .trim()
  .max(128)
  .regex(/^[a-zA-Z0-9_-]*$/)
  .optional();

const filterSchema = z
  .enum(["active", "unread", "answered", "archived", "all"])
  .default("active");

const transferBody = z.object({
  toConsultantId: z.string().trim().min(1).max(64),
  note: z.string().trim().max(500).optional(),
});

function approxDataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

export const chatRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireConsultant);
  app.addHook("preHandler", requireTrustedOrigin);

  app.get("/threads", async (request) => {
    const q = request.query as { filter?: string };
    const parsed = filterSchema.safeParse(q.filter ?? "active");
    const filter = (parsed.success ? parsed.data : "active") as ThreadListFilter;
    const threads = await listThreads({
      filter,
      consultantId: request.consultant!.id,
    });
    return { threads, filter };
  });

  app.get("/threads/:threadId/messages", async (request, reply) => {
    const { threadId: rawId } = request.params as { threadId: string };
    const idParsed = threadIdSchema.safeParse(rawId);
    if (!idParsed.success) {
      return reply.code(400).send({ error: "Thread inválida." });
    }
    const thread = await getThread(idParsed.data);
    if (!thread) {
      return reply.code(404).send({ error: "Thread não encontrada." });
    }
    const afterRaw = (request.query as { after?: string }).after;
    const afterParsed = afterSchema.safeParse(afterRaw);
    if (!afterParsed.success) {
      return reply.code(400).send({ error: "Cursor inválido." });
    }
    await markThreadRead(idParsed.data);
    return {
      thread,
      messages: await getMessages(idParsed.data, afterParsed.data || undefined),
    };
  });

  app.get("/threads/:threadId/stream", async (request, reply) => {
    const { threadId: rawId } = request.params as { threadId: string };
    const idParsed = threadIdSchema.safeParse(rawId);
    if (!idParsed.success) {
      return reply.code(400).send({ error: "Thread inválida." });
    }
    const threadId = idParsed.data;

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write(`event: ready\ndata: ${JSON.stringify({ threadId })}\n\n`);

    const unsubscribe = subscribeThread(threadId, {
      write: (chunk) => reply.raw.write(chunk),
      close: () => reply.raw.end(),
    });

    request.raw.on("close", () => {
      unsubscribe();
    });
  });

  app.post("/threads/:threadId/messages", async (request, reply) => {
    const { threadId: rawId } = request.params as { threadId: string };
    const idParsed = threadIdSchema.safeParse(rawId);
    if (!idParsed.success) {
      return reply.code(400).send({ error: "Thread inválida." });
    }
    const thread = await getThread(idParsed.data);
    if (!thread) {
      return reply.code(404).send({ error: "Thread não encontrada." });
    }
    if (thread.archivedAt) {
      return reply
        .code(409)
        .send({ error: "Conversa arquivada. Desarquive para responder." });
    }

    const parsed = postBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Mensagem inválida." });
    }

    const text = parsed.data.body.trim();
    const rawAttachments = parsed.data.attachments || [];
    if (!text && rawAttachments.length === 0) {
      return reply.code(400).send({ error: "Envie texto ou anexo." });
    }

    if (text) {
      const pii = checkPersonalContact(text);
      if (!pii.ok) {
        return reply.code(422).send({
          error: PII_USER_MESSAGE,
          reason: pii.reason,
        });
      }
    }

    const attachments: ChatAttachment[] = [];
    for (const a of rawAttachments) {
      const size = approxDataUrlBytes(a.dataUrl);
      if (size > MAX_ATTACH_BYTES) {
        return reply.code(413).send({ error: "Anexo acima de 2 MB." });
      }
      if (a.kind === "image" && !a.mime.startsWith("image/")) {
        return reply.code(400).send({ error: "MIME de imagem inválido." });
      }
      if (
        a.kind === "document" &&
        !/^(application\/pdf|text\/plain|application\/msword|application\/vnd\.)/.test(
          a.mime,
        )
      ) {
        return reply.code(400).send({ error: "Tipo de documento não permitido." });
      }
      attachments.push({
        id: `att_${randomUUID().slice(0, 8)}`,
        kind: a.kind,
        name: a.name,
        mime: a.mime,
        size,
        url: a.dataUrl,
      });
    }

    const piiLinks = text
      ? checkPersonalContact(text)
      : { ok: true as const, externalLinks: [] as string[] };
    const externalLinks = piiLinks.ok ? piiLinks.externalLinks : [];

    const message = await enqueueMessage({
      threadId: idParsed.data,
      body: text || (attachments.length ? "(anexo)" : ""),
      role: "consultant",
      attachments: attachments.length ? attachments : undefined,
      externalLinks: externalLinks.length ? externalLinks : undefined,
      authorId: request.consultant!.id,
    });

    return reply.code(201).send({ message });
  });

  /** Arquivar — nunca apaga. Some da lista ativa. */
  app.post("/threads/:threadId/archive", async (request, reply) => {
    const { threadId: rawId } = request.params as { threadId: string };
    const idParsed = threadIdSchema.safeParse(rawId);
    if (!idParsed.success) {
      return reply.code(400).send({ error: "Thread inválida." });
    }
    if (!(await getThread(idParsed.data))) {
      return reply.code(404).send({ error: "Thread não encontrada." });
    }
    const thread = await archiveThread(idParsed.data);
    return { thread, ok: true };
  });

  app.post("/threads/:threadId/unarchive", async (request, reply) => {
    const { threadId: rawId } = request.params as { threadId: string };
    const idParsed = threadIdSchema.safeParse(rawId);
    if (!idParsed.success) {
      return reply.code(400).send({ error: "Thread inválida." });
    }
    if (!(await getThread(idParsed.data))) {
      return reply.code(404).send({ error: "Thread não encontrada." });
    }
    const thread = await unarchiveThread(idParsed.data);
    return { thread, ok: true };
  });

  app.post("/threads/:threadId/transfer", async (request, reply) => {
    const { threadId: rawId } = request.params as { threadId: string };
    const idParsed = threadIdSchema.safeParse(rawId);
    if (!idParsed.success) {
      return reply.code(400).send({ error: "Thread inválida." });
    }
    const parsed = transferBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Destino inválido." });
    }
    if (parsed.data.toConsultantId === request.consultant!.id) {
      return reply
        .code(400)
        .send({ error: "Escolha outra consultora para encaminhar." });
    }

    try {
      const thread = await transferThread({
        threadId: idParsed.data,
        fromConsultantId: request.consultant!.id,
        toConsultantId: parsed.data.toConsultantId,
        note: parsed.data.note,
      });
      return { thread, ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "TARGET_NOT_FOUND") {
        return reply.code(404).send({ error: "Consultora destino não encontrada." });
      }
      if (msg === "THREAD_NOT_FOUND") {
        return reply.code(404).send({ error: "Thread não encontrada." });
      }
      if (msg === "THREAD_ARCHIVED") {
        return reply
          .code(409)
          .send({ error: "Desarquive a conversa antes de encaminhar." });
      }
      throw err;
    }
  });
};
