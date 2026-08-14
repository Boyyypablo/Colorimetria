/**
 * Usuários demo (admin/consultora) só no Postgres local de desenvolvimento.
 * Produção, Neon, VPS e túnel para host remoto não recebem essas contas.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

export function databaseHost(databaseUrl: string | undefined): string | null {
  if (!databaseUrl?.trim()) return null;
  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function shouldSeedDemoUsers(
  env: NodeJS.Dict<string> = process.env,
): boolean {
  if (env.NODE_ENV === "production") return false;
  if (env.ALLOW_DEMO_SEED === "false") return false;

  const host = databaseHost(env.DATABASE_URL);
  if (!host || !LOOPBACK.has(host)) return false;

  return true;
}
