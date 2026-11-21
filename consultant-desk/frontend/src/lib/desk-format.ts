import type { ThreadSummary } from "./chat-client";

const FILTER_IDS = ["active", "unread", "answered", "archived"] as const;

export type DeskFilterId = (typeof FILTER_IDS)[number];

export const DESK_FILTERS: { id: DeskFilterId; label: string }[] = [
  { id: "active", label: "Ativos" },
  { id: "unread", label: "Não respondidos" },
  { id: "answered", label: "Respondidos" },
  { id: "archived", label: "Arquivados" },
];

export function parseDeskFilter(raw: string | null): DeskFilterId {
  if (raw && (FILTER_IDS as readonly string[]).includes(raw)) {
    return raw as DeskFilterId;
  }
  return "active";
}

export function clientInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Sem mensagens";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "agora";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export type ConversationStatusKind =
  | "unread"
  | "waiting"
  | "answered"
  | "archived";

export function conversationStatus(
  t: ThreadSummary,
): { kind: ConversationStatusKind; label: string } {
  if (t.archivedAt) return { kind: "archived", label: "Arquivada" };
  if (t.unreadForConsultant > 0) {
    return { kind: "unread", label: "Não lida" };
  }
  if (t.status === "waiting") return { kind: "waiting", label: "Aguardando" };
  return { kind: "answered", label: "Respondida" };
}

export function roleLabel(role: "client" | "consultant" | "system"): string {
  if (role === "client") return "Cliente";
  if (role === "consultant") return "Você";
  return "Sistema";
}
