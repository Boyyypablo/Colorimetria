import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { chatRoutes } from "./routes/chat.js";
import { reviewsRoutes } from "./routes/reviews.js";
import { assertJwtSecretConfigured } from "./services/auth-tokens.js";

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5174")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Monta o Fastify do desk (local e Vercel). */
export async function buildApp(): Promise<FastifyInstance> {
  assertJwtSecretConfigured();

  const app = Fastify({
    logger: {
      level: process.env.DESK_LOG_LEVEL || "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          'res.headers["set-cookie"]',
          "password",
          "passwordHash",
          "token",
        ],
        censor: "[REDACTED]",
      },
    },
    bodyLimit: 8 * 1024 * 1024,
    trustProxy: true,
  });

  app.setErrorHandler((rawErr, request, reply) => {
    const err = rawErr as Error & { statusCode?: number };
    request.log.error(
      { errName: err.name, statusCode: err.statusCode },
      "request error",
    );
    const status =
      err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    const publicMsg =
      status < 500 && typeof err.message === "string" && err.message.length < 120
        ? err.message
        : "Erro interno.";
    if (
      /postgresql:\/\/|mongodb:\/\/|eyJ[A-Za-z0-9_-]+\./i.test(publicMsg) ||
      /password|secret|token|database_url/i.test(publicMsg)
    ) {
      return reply.code(status).send({ error: "Erro interno." });
    }
    return reply.code(status).send({ error: publicMsg });
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "no-referrer" },
    hsts:
      process.env.DESK_ENV === "production"
        ? { maxAge: 63072000, includeSubDomains: true, preload: true }
        : false,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || corsOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("Origin não permitida"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    ban: 2,
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(reviewsRoutes, { prefix: "/reviews" });
  await app.register(chatRoutes, { prefix: "/chat" });

  return app;
}
