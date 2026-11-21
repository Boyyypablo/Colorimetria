import type { ThreadSummary } from "../../lib/chat-client";
import type { DeskFilterId } from "../../lib/desk-format";
import { ConversationRow } from "./ConversationRow";
import { FilterTabs } from "./FilterTabs";

type ConversationListProps = {
  filter: DeskFilterId;
  onFilterChange: (id: DeskFilterId) => void;
  filterQuery: string;
  threads: ThreadSummary[];
  activeThreadId?: string;
  unreadCount: number;
  note: string;
  error: string;
  busyId: string | null;
  onArchive: (threadId: string, archived: boolean) => void;
  onTransfer: (threadId: string) => void;
};

export function ConversationList({
  filter,
  onFilterChange,
  filterQuery,
  threads,
  activeThreadId,
  unreadCount,
  note,
  error,
  busyId,
  onArchive,
  onTransfer,
}: ConversationListProps) {
  const badge =
    filter === "unread"
      ? threads.length
      : unreadCount > 0
        ? unreadCount
        : 0;

  return (
    <div className="conv-list">
      <header className="conv-list__head">
        <h1>
          Conversas
          {badge > 0 ? (
            <span className="inbox-badge" title="Não respondidos">
              {badge}
            </span>
          ) : null}
        </h1>
      </header>

      <FilterTabs value={filter} onChange={onFilterChange} />

      {error ? <p className="auth-error">{error}</p> : null}

      {threads.length === 0 ? (
        <p className="empty conv-list__empty">
          {note || "Nenhuma conversa neste filtro."}
        </p>
      ) : (
        <ul className="conv-list__items">
          {threads.map((t) => (
            <ConversationRow
              key={t.id}
              thread={t}
              active={t.id === activeThreadId}
              filterQuery={filterQuery}
              busy={busyId === `arch-${t.id}` || busyId === `xfer-${t.id}`}
              onArchive={onArchive}
              onTransfer={onTransfer}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
