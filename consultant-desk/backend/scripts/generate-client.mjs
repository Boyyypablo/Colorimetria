/**
 * Gera o Prisma Client a partir do schema do monorepo.
 * Funciona no Root Directory da Vercel (consultant-desk/backend).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(here, "..");
const schema = resolve(backendRoot, "../../prisma/schema.prisma");

if (!existsSync(schema)) {
  console.error(`[desk] Prisma schema não encontrado em ${schema}`);
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["prisma", "generate", `--schema=${schema}`],
  { stdio: "inherit", shell: true, cwd: backendRoot, env: process.env },
);

process.exit(result.status ?? 1);
