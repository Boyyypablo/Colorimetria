/**
 * Cria ou atualiza senha de um usuário por e-mail.
 * Uso: node scripts/upsert-user-password.mjs email@x.com "senha"
 * Não imprime a senha.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = String(process.argv[2] || "")
  .trim()
  .toLowerCase();
const password = String(process.argv[3] || "").trim();

if (!email.includes("@") || password.length < 8) {
  console.error('Uso: node scripts/upsert-user-password.mjs email@x.com "senha" (mín. 8)');
  process.exit(1);
}

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);
const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
  await prisma.user.update({
    where: { email },
    data: { passwordHash, lgpdConsentAt: existing.lgpdConsentAt ?? new Date() },
  });
  console.log(JSON.stringify({ email, status: "password_updated" }));
} else {
  await prisma.user.create({
    data: {
      email,
      name: email.split("@")[0],
      passwordHash,
      role: "USER",
      lgpdConsentAt: new Date(),
    },
  });
  console.log(JSON.stringify({ email, status: "created" }));
}

await prisma.$disconnect();
