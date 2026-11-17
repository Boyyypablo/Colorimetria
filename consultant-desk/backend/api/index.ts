import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../dist/app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance | null = null;

async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

/**
 * Entrypoint serverless da Vercel — encaminha HTTP para o Fastify.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const instance = await getApp();
  instance.server.emit("request", req, res);
}
