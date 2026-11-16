import type { FastifyReply, FastifyRequest } from "fastify";
import {
  DESK_COOKIE,
  verifyDeskToken,
} from "../services/auth-tokens.js";
import { findById, publicConsultant } from "../services/consultants-store.js";

function extractToken(request: FastifyRequest): string | undefined {
  const cookieToken = request.cookies?.[DESK_COOKIE];
  if (cookieToken) return cookieToken;

  if (process.env.DESK_ALLOW_BEARER === "true") {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const bearer = header.slice("Bearer ".length).trim();
      if (bearer) return bearer;
    }
  }

  return undefined;
}

/**
 * Exige consultora autenticada (cookie httpOnly; Bearer opcional via env).
 * Contas vêm do Postgres/Supabase (role CONSULTANT|ADMIN).
 */
export async function requireConsultant(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractToken(request);
  if (!token) {
    return reply.code(401).send({ error: "Não autenticada." });
  }

  const payload = await verifyDeskToken(token);
  if (!payload) {
    return reply.code(401).send({ error: "Sessão inválida ou expirada." });
  }

  const record = await findById(payload.sub);
  if (!record) {
    return reply.code(401).send({ error: "Consultora não encontrada." });
  }

  request.consultant = publicConsultant(record);
}
