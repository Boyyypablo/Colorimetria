import type { FastifyPluginAsync } from "fastify";

const statusPayload = {
  ok: true,
  service: "consultant-desk-backend",
} as const;

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => statusPayload);
  app.get("/health", async () => statusPayload);
};
