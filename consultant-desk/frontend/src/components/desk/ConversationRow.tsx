import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ThreadSummary } from "../../lib/chat-client";
import {
  clientInitials,
  conversationStatus,
  relativeTime,
} from "../../lib/desk-format";

type ConversationRowProps = {
  thread: ThreadSummary;
  active: boolean;
  filterQuery: string;
  busy: boolean;
  onArchive: (threadId: string, archived: boolean) => void;
  onTransfer: (threadId: string) => void;
};

export function ConversationRow({
  thread: t,
  active,
  filterQuery,
  busy,
  onArchive,
  onTransfer,
}: ConversationRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const archived = Boolean(t.archivedAt);
  const status = conversationStatus(t);
  const unread = t.unreadForConsultant > 0;

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <li
      className={[
        "conv-row",
        unread ? "conv-row--unread" : "",
        active ? "conv-row--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Link
        className="conv-row__main"
        to={`/threads/${t.id}${filterQuery}`}
        aria-current={active ? "page" : undefined}
      >
        <span className="conv-avatar" aria-hidden>
          {clientInitials(t.clientLabel)}
        </span>
        <span className="conv-row__body">
          <span className="conv-row__top">
            <span className="conv-row__title">{t.clientLabel}</span>
            <time className="conv-row__time" dateTime={t.lastMessageAt || undefined}>
              {relativeTime(t.lastMessageAt)}
            </time>
          </span>
          <span className="conv-row__bottom">
            <span className={`conv-chip conv-chip--${status.kind}`}>
              {status.label}
            </span>
            <span className="conv-row__assignee">
              {t.assignedConsultantName || "Sem responsável"}
            </span>
          </span>
        </span>
        {unread ? (
          <span className="conv-badge" title="Mensagens não lidas">
            {t.unreadForConsultant}
          </span>
        ) : null}
      </Link>

      <div className="conv-row__menu" ref={wrapRef}>
        <button
          type="button"
          className="conv-menu-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label="Ações da conversa"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          ⋯
        </button>
        {menuOpen ? (
          <div className="conv-menu" id={menuId} role="menu">
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setMenuOpen(false);
                onArchive(t.id, archived);
              }}
            >
              {archived ? "Desarquivar" : "Arquivar"}
            </button>
            {!archived ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onTransfer(t.id);
                }}
              >
                Encaminhar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
