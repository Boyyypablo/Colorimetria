/**
 * Build na Vercel: Prisma generate + migrate + next build.
 * Aceita DATABASE_URL ou aliases injetados pelo Neon no Marketplace.
 * 
 * Preview mode: Se VERCEL_ENV=preview e sem DB, gera Prisma client mas skip migrations
 */
import { spawnSync } from "node:child_process";

const db =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

const isPreview = process.env.VERCEL_ENV === "preview";

if (!db) {
  if (isPreview) {
    console.warn(`
╔══════════════════════════════════════════════════════════════════╗
║  Preview build without DATABASE_URL                              ║
║  → Prisma client will be generated with dummy URL                ║
║  → Migrations skipped (preview-only build)                       ║
║  → Runtime DB calls will fail (expected for UI preview)          ║
╚══════════════════════════════════════════════════════════════════╝
`);
    // Dummy URL for Prisma client generation only
    process.env.DATABASE_URL = "postgresql://preview:preview@localhost:5432/preview?schema=public";
  } else {
    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  Falta DATABASE_URL no projeto Vercel                            ║
╠══════════════════════════════════════════════════════════════════╣
║  1. Abra o projeto → Storage → Create Database → Neon            ║
║  2. Conecte ao projeto (injeta DATABASE_URL / POSTGRES_URL)      ║
║  3. Settings → Env: AUTH_SECRET + AUTH_URL                       ║
║  4. Redeploy                                                     ║
║                                                                  ║
║  Docs: https://vercel.com/docs/storage/vercel-postgres           ║
╚══════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }
} else {
  process.env.DATABASE_URL = db;
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Always generate Prisma client
run("npx", ["prisma", "generate"]);

// Only run migrations if we have a real DB
if (db) {
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log("⏭️  Skipping migrations (preview mode without DB)");
}

run("npx", ["next", "build"]);
