/**
 * Remove connection strings, tokens, CPF/CNPJ e credenciais de strings que
 * possam ir para logs ou respostas de API.
 */

const SECRETISH =
  /(?:postgresql|postgres|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"'`]+/gi;

const KEY_VALUE_SECRET =
  /(?:password|passwd|pwd|secret|token|api[_-]?key|authorization|bearer|database_url|direct_url|auth_secret|jwt_secret|asaas[_-]?api[_-]?key|asaas[_-]?webhook[_-]?token|access_token)\s*[:=]\s*["']?[^\s"'`,;]+/gi;

const JWT_LIKE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

const LONG_HEX_OR_B64 = /\b(?:[A-Za-z0-9+/]{40,}={0,2}|[a-f0-9]{48,})\b/gi;

/** CPF (11) / CNPJ (14) com ou sem máscara — nunca logar documento. */
const CPF_CNPJ =
  /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g;

export function redactSecrets(input: string): string {
  return input
    .replace(SECRETISH, "[REDACTED_DB_URL]")
    .replace(KEY_VALUE_SECRET, "[REDACTED_SECRET]")
    .replace(JWT_LIKE, "[REDACTED_JWT]")
    .replace(CPF_CNPJ, "[REDACTED_DOC]")
    .replace(LONG_HEX_OR_B64, "[REDACTED]");
}

/** Mensagem segura para o cliente — nunca repassa stack/URL/credencial. */
export function clientSafeErrorMessage(
  err: unknown,
  fallback = "Não foi possível concluir a operação.",
): string {
  if (!(err instanceof Error) || !err.message) return fallback;
  const msg = err.message;
  if (
    SECRETISH.test(msg) ||
    KEY_VALUE_SECRET.test(msg) ||
    CPF_CNPJ.test(msg) ||
    /prisma|econnrefused|enotfound|ssl|authentication failed|p1001|p1017|asaas_api_key/i.test(
      msg,
    )
  ) {
    // Reset lastIndex after /g tests
    SECRETISH.lastIndex = 0;
    KEY_VALUE_SECRET.lastIndex = 0;
    CPF_CNPJ.lastIndex = 0;
    return fallback;
  }
  SECRETISH.lastIndex = 0;
  KEY_VALUE_SECRET.lastIndex = 0;
  CPF_CNPJ.lastIndex = 0;
  const cleaned = redactSecrets(msg).trim();
  if (!cleaned || cleaned.length > 180) return fallback;
  return cleaned;
}
