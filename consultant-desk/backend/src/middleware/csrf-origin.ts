import type { FastifyReply, FastifyRequest } from "fastify";

const allowed = () =>
  (process.env.CORS_ORIGIN || "http://localhost:5174")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Bloqueia mutações cross-site sem Origin/Referer da allowlist (além do CORS).
 */
export async function requireTrustedOrigin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.method === "GET" || request.method === "HEAD") return;

  const origin = request.headers.origin;
  const referer = request.headers.referer;
  const list = allowed();

  if (origin) {
    if (!list.includes(origin)) {
      return reply.code(403).send({ error: "Origin não permitida." });
    }
    return;
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!list.includes(refOrigin)) {
        return reply.code(403).send({ error: "Referer não permitido." });
      }
      return;
    } catch {
      return reply.code(403).send({ error: "Referer inválido." });
    }
  }

  // Sem Origin/Referer: típico de curl local — só em não-produção.
  if (process.env.DESK_ENV === "production") {
    return reply.code(403).send({ error: "Origin obrigatória." });
  }
}
