/**
 * Troca rápida da senha das contas demo no Supabase (Prisma).
 * Uso (agente de voz / CLI):
 *   node scripts/set-demo-passwords.mjs "novaSenha"
 *   DEMO_PASSWORD=novaSenha npm run db:set-demo-password
 *
 * Não imprime a senha. Só e-mails + ok/FAIL.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const EMAILS = [
  "usuaria@colometria.app",
  "consultora@colometria.app",
  "admin@colometria.app",
];

const password = (process.argv[2] || process.env.DEMO_PASSWORD || "").trim();
if (!password || password.length < 6) {
  console.error("Uso: node scripts/set-demo-passwords.mjs \"senha\" (mín. 6)");
  process.exit(1);
}

const prisma = new PrismaClient();

const hash = await bcrypt.hash(password, 12);
const results = [];

for (const email of EMAILS) {
  const updated = await prisma.user.updateMany({
    where: { email },
    data: { passwordHash: hash },
  });
  if (updated.count === 0) {
    results.push({ email, status: "MISSING" });
    continue;
  }
  const row = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true },
  });
  const ok = row ? await bcrypt.compare(password, row.passwordHash) : false;
  results.push({ email, status: ok ? "ok" : "FAIL" });
}

await prisma.$disconnect();
console.log(JSON.stringify({ updated: results }, null, 2));
if (results.some((r) => r.status !== "ok")) process.exit(1);
