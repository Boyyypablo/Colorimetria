import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { DeskConsultant, DeskConsultantRecord } from "../types/auth.js";

const DESK_ROLES: Role[] = ["CONSULTANT", "ADMIN"];

function toPublic(row: {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}): DeskConsultant {
  return {
    id: row.id,
    email: row.email,
    name: row.name?.trim() || row.email.split("@")[0] || "Consultora",
    createdAt: row.createdAt.toISOString(),
  };
}

function toRecord(row: {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
}): DeskConsultantRecord {
  return {
    ...toPublic(row),
    passwordHash: row.passwordHash,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findByEmail(
  email: string,
): Promise<DeskConsultantRecord | undefined> {
  const row = await prisma.user.findFirst({
    where: {
      email: normalizeEmail(email),
      role: { in: DESK_ROLES },
    },
  });
  return row ? toRecord(row) : undefined;
}

export async function findById(
  id: string,
): Promise<DeskConsultantRecord | undefined> {
  const row = await prisma.user.findFirst({
    where: { id, role: { in: DESK_ROLES } },
  });
  return row ? toRecord(row) : undefined;
}

export async function createConsultant(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<DeskConsultantRecord> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("EMAIL_TAKEN");
  }

  const row = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      role: "CONSULTANT",
      lgpdConsentAt: new Date(),
    },
  });
  return toRecord(row);
}

export function publicConsultant(
  record: DeskConsultantRecord,
): DeskConsultant {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    createdAt: record.createdAt,
  };
}

/** Outras consultoras/admins para encaminhamento. */
export async function listPeerConsultants(
  excludeId: string,
): Promise<DeskConsultant[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: { in: DESK_ROLES },
      id: { not: excludeId },
    },
    orderBy: { name: "asc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return rows.map(toPublic);
}
