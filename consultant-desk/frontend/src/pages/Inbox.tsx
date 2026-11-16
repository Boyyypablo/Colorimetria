import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  archiveThread,
  intakeReview,
  listPendingReviews,
  listPeerConsultants,
  listThreads,
  transferThread,
  unarchiveThread,
  type DeskPeer,
  type PendingReviewItem,
  type ThreadListFilter,
  type ThreadSummary,
} from "../lib/chat-client";

const FILTERS: { id: ThreadListFilter; label: string }[] = [
  { id: "active", label: "Ativos" },
  { id: "unread", label: "Não respondidos" },
  { id: "answered", label: "Respondidos" },
  { id: "archived", label: "Arquivados" },
];

export function InboxPage() {
  const [pending, setPending] = useState<PendingReviewItem[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [filter, setFilter] = useState<ThreadListFilter>("active");
  const [note, setNote] = useState("Carregando…");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [peers, setPeers] = useState<DeskPeer[]>([]);
  const [transferFor, setTransferFor] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [reviews, inbox, peerList] = await Promise.all([
        listPendingReviews(),
        listThreads(filter),
        listPeerConsultants().catch(() => ({ consultants: [] as DeskPeer[] })),
      ]);
      startTransition(() => {
        setPending(reviews.items);
        setThreads(inbox.threads);
        setPeers(peerList.consultants);
        setNote(
          reviews.items.length === 0 && inbox.threads.length === 0
            ? filter === "archived"
              ? "Nenhuma conversa arquivada."
              : "Nenhuma avaliação pendente. Simule uma entrada da cliente para testar."
            : "",
        );
        setError("");
      });
    } catch {
      setNote("");
      setError(
        "Backend offline. Confirme npm run dev em consultant-desk/backend.",
      );
    }
  }, [filter]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 6000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const unreadCount = useMemo(
    () => threads.filter((t) => t.unreadForConsultant > 0).length,
    [threads],
  );

  async function onSimulate() {
    setBusyId("intake");
    try {
      await intakeReview({
        clientLabel: "Cliente Demo",
        seasonName: "Outono Suave",
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar avaliação.");
    } finally {
      setBusyId(null);
    }
  }

  async function onArchive(threadId: string, archived: boolean) {
    setBusyId(`arch-${threadId}`);
    try {
      if (archived) await unarchiveThread(threadId);
      else await archiveThread(threadId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao arquivar.");
    } finally {
      setBusyId(null);
    }
  }

  async function onTransfer(e: FormEvent) {
    e.preventDefault();
    if (!transferFor || !transferTo) return;
    setBusyId(`xfer-${transferFor}`);
    try {
      await transferThread(transferFor, transferTo, transferNote || undefined);
      setTransferFor(null);
      setTransferTo("");
      setTransferNote("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao encaminhar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="desk-home">
      <section className="panel">
        <div className="panel-head">
          <h1>Avaliações pendentes</h1>
          <button
            type="button"
            className="btn-soft"
            disabled={busyId === "intake"}
            onClick={() => void onSimulate()}
          >
            {busyId === "intake" ? "Criando…" : "Simular avaliação da cliente"}
          </button>
        </div>
        {error ? <p className="auth-error">{error}</p> : null}
        {note && pending.length === 0 ? <p className="empty">{note}</p> : null}
        <ul className="pending-list">
          {pending.map((r) => (
            <li key={r.id} className="pending-card">
              <div>
                <p className="pending-card__badge">{r.label}</p>
                <p className="pending-card__title">{r.clientLabel}</p>
                <p className="pending-card__meta">
                  {r.seasonName || "Estação em análise"} ·{" "}
                  {new Date(r.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="pending-card__actions">
                <Link className="btn-primary" to={`/threads/${r.threadId}`}>
                  Abrir chat / responder
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h1>
            Inbox de chat
            {filter === "unread" || unreadCount > 0 ? (
              <span className="inbox-badge" title="Não respondidos neste filtro">
                {filter === "unread" ? threads.length : unreadCount}
              </span>
            ) : null}
          </h1>
        </div>

        <div className="filter-tabs" role="tablist" aria-label="Filtro de chats">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={
                filter === f.id ? "filter-tab filter-tab--on" : "filter-tab"
              }
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {threads.length === 0 ? (
          <p className="empty">Nenhuma conversa neste filtro.</p>
        ) : (
          <ul className="thread-list">
            {threads.map((t) => {
              const waiting = t.unreadForConsultant > 0;
              const archived = Boolean(t.archivedAt);
              return (
                <li
                  key={t.id}
                  className={
                    waiting
                      ? "thread-row thread-row--unread"
                      : "thread-row"
                  }
                >
                  <Link className="thread-row__main" to={`/threads/${t.id}`}>
                    <span className="thread-row__title">
                      {waiting ? (
                        <span className="dot-unread" aria-hidden />
                      ) : (
                        <span className="dot-read" aria-hidden />
                      )}
                      {t.clientLabel}
                    </span>
                    <span className="thread-row__meta">
                      {waiting
                        ? `${t.unreadForConsultant} não lida(s)`
                        : archived
                          ? "Arquivada"
                          : t.status === "waiting"
                            ? "Aguardando"
                            : "Respondida / ativa"}
                      {t.assignedConsultantName
                        ? ` · ${t.assignedConsultantName}`
                        : ""}
                      {t.lastMessageAt
                        ? ` · ${new Date(t.lastMessageAt).toLocaleString("pt-BR")}`
                        : ""}
                    </span>
                  </Link>
                  <div className="thread-row__actions">
                    <Link className="btn-primary" to={`/threads/${t.id}`}>
                      Responder
                    </Link>
                    <button
                      type="button"
                      className="btn-soft"
                      disabled={busyId === `arch-${t.id}`}
                      onClick={() => void onArchive(t.id, archived)}
                    >
                      {archived ? "Desarquivar" : "Arquivar"}
                    </button>
                    {!archived ? (
                      <button
                        type="button"
                        className="btn-soft"
                        onClick={() => {
                          setTransferFor(t.id);
                          setTransferTo(peers[0]?.id || "");
                        }}
                      >
                        Encaminhar
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {transferFor ? (
        <div className="link-gate" role="dialog" aria-modal="true">
          <form className="link-gate__card" onSubmit={(e) => void onTransfer(e)}>
            <p className="link-gate__eyebrow">Encaminhar conversa</p>
            <h2>Transferir para outra consultora</h2>
            {peers.length === 0 ? (
              <p className="empty">
                Não há outras consultoras cadastradas no Supabase. Cadastre outra
                conta no desk para transferir.
              </p>
            ) : (
              <>
                <label className="auth-form">
                  Consultora destino
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {peers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-form">
                  Nota (opcional)
                  <input
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    maxLength={500}
                    placeholder="Contexto para a colega"
                  />
                </label>
              </>
            )}
            <div className="link-gate__actions">
              <button
                type="button"
                className="link-gate__secondary"
                onClick={() => setTransferFor(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="link-gate__primary"
                disabled={!transferTo || peers.length === 0}
              >
                Encaminhar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
