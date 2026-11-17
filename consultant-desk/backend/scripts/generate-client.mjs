/**
 * Gera o Prisma Client DENTRO de consultant-desk/backend/node_modules
 * (Root Directory da Vercel), a partir do schema do monorepo.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(here, "..");
const rootSchema = resolve(backendRoot, "../../prisma/schema.prisma");
const localPrismaDir = resolve(backendRoot, "prisma");
const localSchema = resolve(localPrismaDir, "schema.prisma");

if (!existsSync(rootSchema)) {
  console.error(`[desk] Prisma schema não encontrado em ${rootSchema}`);
  process.exit(1);
}

const original = readFileSync(rootSchema, "utf8");
const patched = original.replace(
  /generator\s+client\s*\{[^}]*\}/s,
  `generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}`,
);

mkdirSync(localPrismaDir, { recursive: true });
writeFileSync(localSchema, patched, "utf8");

const result = spawnSync(
  "npx",
  ["prisma", "generate", `--schema=${localSchema}`],
  { stdio: "inherit", shell: true, cwd: backendRoot, env: process.env },
);

process.exit(result.status ?? 1);
