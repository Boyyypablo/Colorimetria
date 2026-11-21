/** Helpers de perfil público (idade, UF, etc.). */

export function ageFromBirthDate(
  birthDate: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (!birthDate) return null;
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function parseBirthDateInput(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // YYYY-MM-DD from <input type="date">
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  if (Number.isNaN(dt.getTime())) return null;
  const now = new Date();
  if (dt.getUTCFullYear() < 1920 || dt > now) return null;
  return dt;
}

export const BR_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type BrUf = (typeof BR_UFS)[number];

export function normalizeUf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  if (!(BR_UFS as readonly string[]).includes(u)) return null;
  return u;
}
