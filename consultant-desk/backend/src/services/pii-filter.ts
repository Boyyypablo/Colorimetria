/**
 * Bloqueia contato direto (telefone, e-mail, apps de mensagem).
 * Links gerais (Instagram, sites, etc.) são permitidos — o front avisa ao abrir.
 */

export type PiiCheckResult =
  | { ok: true; externalLinks: string[] }
  | { ok: false; reason: "personal_contact_blocked"; matched: string[] };

const BLOCK_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "email", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  {
    id: "phone",
    re: /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}\b/,
  },
  { id: "whatsapp", re: /(?:wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)/i },
  { id: "telegram", re: /(?:t\.me\/|telegram\.me\/)/i },
  {
    id: "direct_invite",
    re: /(?:me\s+chama|me\s+liga|manda\s+(?:zap|whats|msg)|dm\s+no\s+zap)/i,
  },
];

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export function extractExternalLinks(text: string): string[] {
  const found = text.match(URL_RE) || [];
  return [...new Set(found.map((u) => u.replace(/[.,);]+$/, "")))];
}

export function checkPersonalContact(text: string): PiiCheckResult {
  const matched: string[] = [];
  for (const p of BLOCK_PATTERNS) {
    if (p.re.test(text)) matched.push(p.id);
  }
  if (matched.length > 0) {
    return { ok: false, reason: "personal_contact_blocked", matched };
  }
  return { ok: true, externalLinks: extractExternalLinks(text) };
}

export const PII_USER_MESSAGE =
  "Não compartilhe telefone, e-mail ou apps de mensagem direta. Links de sites e redes (ex.: Instagram) são permitidos.";
