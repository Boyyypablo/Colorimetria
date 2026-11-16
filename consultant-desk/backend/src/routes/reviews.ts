import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireConsultant } from "../middleware/auth.js";
import { requireTrustedOrigin } from "../middleware/csrf-origin.js";
import {
  getReview,
  intakeClientEvaluation,
  listPendingReviews,
  sendAutoReport,
} from "../services/reviews-store.js";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);

const intakeBody = z
  .object({
    clientLabel: z.string().trim().min(2).max(120).optional(),
    seasonName: z.string().trim().min(2).max(80).nullable().optional(),
    analysisId: z.string().trim().min(2).max(64).optional(),
  })
  .optional();

export const reviewsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireConsultant);
  app.addHook("preHandler", requireTrustedOrigin);

  app.get("/", async (request) => {
    const items = await listPendingReviews({
      consultantId: request.consultant!.id,
    });
    return {
      items: items.map((r) => ({
        id: r.id,
        analysisId: r.analysisId,
        threadId: r.threadId,
        clientLabel: r.clientLabel,
        seasonName: r.seasonName,
        status: r.status,
        createdAt: r.createdAt,
        reportSentAt: r.reportSentAt,
        assignedConsultantId: r.assignedConsultantId,
        label:
          r.status === "pending" ? "Avaliação pendente" : "Relatório enviado",
      })),
    };
  });

  app.post("/intake", async (request, reply) => {
    const parsed = intakeBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "Payload inválido." });
    }
    const review = await intakeClientEvaluation({
      ...parsed.data,
      assignedConsultantId: request.consultant!.id,
    });
    return reply.code(201).send({ review });
  });

  app.get("/:reviewId", async (request, reply) => {
    const { reviewId } = request.params as { reviewId: string };
    const id = idSchema.safeParse(reviewId);
    if (!id.success) return reply.code(400).send({ error: "ID inválido." });
    const review = await getReview(id.data);
    if (!review) return reply.code(404).send({ error: "Não encontrada." });
    return { review };
  });

  app.post("/:reviewId/send-report", async (request, reply) => {
    const { reviewId } = request.params as { reviewId: string };
    const id = idSchema.safeParse(reviewId);
    if (!id.success) return reply.code(400).send({ error: "ID inválido." });
    try {
      const review = await sendAutoReport(id.data);
      return { review, ok: true };
    } catch {
      return reply.code(404).send({ error: "Avaliação não encontrada." });
    }
  });
};
