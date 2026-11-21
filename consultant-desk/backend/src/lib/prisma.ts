import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
const deskEnv = resolve(here, "../../.env");
const rootEnv = resolve(here, "../../../../.env");
/**
 * Local: carrega .env (raiz + desk).
 * Vercel: NÃO carregar .env do bundle — senão sobrescreve DATABASE_URL/CORS/JWT
 * injetados pelo painel (dotenv override).
 */
if (!process.env.VERCEL) {
  config({ path: rootEnv });
  config({ path: deskEnv, override: true });
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL ausente. Configure no .env da raiz (Supabase) ou em consultant-desk/backend/.env",
  );
}

const globalForPrisma = globalThis as unknown as { deskPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.deskPrisma ??
  new PrismaClient({
    log: process.env.DESK_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.DESK_ENV !== "production") {
  globalForPrisma.deskPrisma = prisma;
}
