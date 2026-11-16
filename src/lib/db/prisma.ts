import { PrismaClient } from "@prisma/client";

/**
 * Normaliza DATABASE_URL antes do Prisma Client.
 * Produção: Supabase Postgres (só no servidor — ver docs/architecture/supabase.md).
 * Aliases extras cobrem Neon/Vercel Marketplace se ainda existirem.
 */
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const fallback =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DIRECT_URL;
  if (fallback) {
    process.env.DATABASE_URL = fallback;
  }
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
