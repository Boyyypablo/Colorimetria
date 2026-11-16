import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireConsultant } from "../middleware/auth.js";
import { requireTrustedOrigin } from "../middleware/csrf-origin.js";
import {
  clearAuthFailures,
  isLocked,
  lockoutKey,
  recordAuthFailure,
} from "../services/auth-lockout.js";
import {
  cookieOptions,
  DESK_COOKIE,
  signDeskToken,
} from "../services/auth-tokens.js";
import {
  createConsultant,
  findByEmail,
  listPeerConsultants,
  publicConsultant,
} from "../services/consultants-store.js";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(320)
  .email()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "E-mail inválido");

const passwordSchema = z
  .string()
  .min(10, "Senha mínima 10 caracteres")
  .max(128)
  .regex(/[A-Za-z]/, "Senha precisa de letra")
  .regex(/[0-9]/, "Senha precisa de número")
  .regex(/[^A-Za-z0-9]/, "Senha precisa de caractere especial");

const registerBody = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[\p{L}\p{M}\s'.-]+$/u, "Nome inválido"),
});

const loginBody = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

/** Hash válido só para equalizar tempo de resposta quando o e-mail não existe. */
const DUMMY_HASH =
  "$2b$12$cQmzmB4fm9fVTNlzmTSoDOvC2kTaBcgZtUnU7T8hcheI4lUS5nbrG";

const authRateLimit = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: "1 minute",
    },
  },
};

function clientIp(request: { ip: string; headers: Record<string, unknown> }): string {
  const fwd = request.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0]?.trim() || request.ip;
  }
  return request.ip || "unknown";
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTrustedOrigin);

  app.post("/register", authRateLimit, async (request, reply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error:
          "Dados inválidos. Nome, e-mail válido e senha (mín. 10, letra, número e especial).",
      });
    }

    const { email, password, name } = parsed.data;
    const key = lockoutKey(email, clientIp(request));
    const lock = isLocked(key);
    if (lock.locked) {
      return reply
        .code(429)
        .header("Retry-After", String(lock.retryAfterSec))
        .send({ error: "Muitas tentativas. Aguarde e tente de novo." });
    }

    if (await findByEmail(email)) {
      recordAuthFailure(key);
      return reply.code(409).send({ error: "Este e-mail já está cadastrado." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let record;
    try {
      record = await createConsultant({ email, name, passwordHash });
    } catch {
      return reply.code(409).send({ error: "Este e-mail já está cadastrado." });
    }

    clearAuthFailures(key);
    const consultant = publicConsultant(record);
    const token = await signDeskToken({
      sub: consultant.id,
      email: consultant.email,
      name: consultant.name,
    });

    reply.setCookie(DESK_COOKIE, token, cookieOptions());
    return reply.code(201).send({ consultant });
  });

  app.post("/login", authRateLimit, async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "E-mail ou senha inválidos." });
    }

    const key = lockoutKey(parsed.data.email, clientIp(request));
    const lock = isLocked(key);
    if (lock.locked) {
      return reply
        .code(429)
        .header("Retry-After", String(lock.retryAfterSec))
        .send({ error: "Muitas tentativas. Aguarde e tente de novo." });
    }

    const record = await findByEmail(parsed.data.email);
    const hash = record?.passwordHash || DUMMY_HASH;
    const ok = await bcrypt.compare(parsed.data.password, hash);
    if (!record || !ok) {
      recordAuthFailure(key);
      return reply.code(401).send({ error: "E-mail ou senha incorretos." });
    }

    clearAuthFailures(key);
    const consultant = publicConsultant(record);
    const token = await signDeskToken({
      sub: consultant.id,
      email: consultant.email,
      name: consultant.name,
    });

    reply.setCookie(DESK_COOKIE, token, cookieOptions());
    return { consultant };
  });

  app.post("/logout", async (_request, reply) => {
    reply.clearCookie(DESK_COOKIE, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.DESK_COOKIE_SECURE === "true",
    });
    return { ok: true };
  });

  app.get("/me", { preHandler: requireConsultant }, async (request) => {
    return { consultant: request.consultant };
  });

  /** Lista peers para encaminhar conversa. */
  app.get(
    "/consultants",
    { preHandler: requireConsultant },
    async (request) => {
      const me = request.consultant!;
      const consultants = await listPeerConsultants(me.id);
      return { consultants };
    },
  );
};
