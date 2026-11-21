import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLinkGate } from "../ExternalLinkGate";
import {
  archiveThread,
  getMessages,
  listPendingReviews,
  openThreadStream,
  postMessage,
  sendAutoReport,
  transferThread,
  unarchiveThread,
  type ChatMessage,
  type ClientProfile,
  type DeskPeer,
  type ThreadSummary,
} from "../../lib/chat-client";
import { conversationStatus } from "../../lib/desk-format";
import { playSoftChime } from "../../lib/notify-chime";
import { ClientProfileCard } from "./ClientProfileCard";
import { Composer, type PendingAttach } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { TransferDialog } from "./TransferDialog";

type ThreadPaneProps = {
  threadId: string;
  filterQuery: string;
  showBackLink: boolean;
  peers: DeskPeer[];
  onThreadMetaChange?: () => void;
};

export function ThreadPane({
  threadId,
  filterQuery,
  showBackLink,
  peers,
  onThreadMetaChange,
}: ThreadPaneProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<ThreadSummary | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(
    null,
  );
  const [hint, setHint] = useState("Conectando…");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    startTransition(() => {
      setMessages((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        for (const m of incoming) map.set(m.id, m);
        const next = [...map.values()].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        );
        cursorRef.current = next[next.length - 1]?.id;
        return next;
      });
    });
  }, []);

  useEffect(() => {
    setMessages([]);
    setThread(null);
    setClientProfile(null);
    setReviewId(null);
    cursorRef.current = undefined;
    setHint("Conectando…");

    let stopPoll: (() => void) | undefined;
    let es: EventSource | undefined;
    let cancelled = false;

    (async () => {
      try {
        const data = await getMessages(threadId);
        if (cancelled) return;
        mergeMessages(data.messages);
        if (data.thread) setThread(data.thread);
        if (data.clientProfile) setClientProfile(data.clientProfile);
        setHint(
          data.thread?.archivedAt
            ? "Conversa arquivada (somente leitura até desarquivar)."
            : "Chat ativo",
        );
        const reviews = await listPendingReviews().catch(() => ({
          items: [] as Awaited<ReturnType<typeof listPendingReviews>>["items"],
        }));
        const match = reviews.items.find((r) => r.threadId === threadId);
        if (match) setReviewId(match.id);
        onThreadMetaChange?.();
      } catch {
        setHint("Não foi possível carregar mensagens.");
      }
    })();

    try {
      es = openThreadStream(threadId);
      es.addEventListener("message", (ev) => {
        try {
          const msg = JSON.parse(ev.data) as ChatMessage;
          if (msg.role === "client") playSoftChime();
          mergeMessages([msg]);
        } catch {
          /* ignore */
        }
      });
      es.onerror = () => {
        es?.close();
        setHint("SSE instável — polling leve ativo");
        const id = window.setInterval(() => {
          if (document.visibilityState !== "visible") return;
          void getMessages(threadId, cursorRef.current)
            .then((d) => {
              if (d.messages.some((m) => m.role === "client")) playSoftChime();
              if (d.messages.length) mergeMessages(d.messages);
              if (d.thread) setThread(d.thread);
            })
            .catch(() => undefined);
        }, 2000);
        stopPoll = () => window.clearInterval(id);
      };
    } catch {
      /* polling only */
    }

    return () => {
      cancelled = true;
      es?.close();
      stopPoll?.();
    };
  }, [threadId, mergeMessages, onThreadMetaChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function onSend(body: string, attachments: PendingAttach[]) {
    if (thread?.archivedAt) return;
    setSending(true);
    try {
      const res = await postMessage(threadId, body, attachments);
      mergeMessages([res.message]);
      setHint("Mensagem enviada.");
      setThread((prev) =>
        prev ? { ...prev, unreadForConsultant: 0, status: "open" } : prev,
      );
      onThreadMetaChange?.();
    } catch (err) {
      setHint(err instanceof Error ? err.message : "Falha ao enviar.");
      throw err;
    } finally {
      setSending(false);
    }
  }

  async function onToggleArchive() {
    if (!thread) return;
    try {
      const res = thread.archivedAt
        ? await unarchiveThread(threadId)
        : await archiveThread(threadId);
      setThread(res.thread);
      setHint(
        res.thread.archivedAt
          ? "Arquivada — some da lista ativa, histórico preservado."
          : "Desarquivada — voltou aos ativos.",
      );
      onThreadMetaChange?.();
      if (res.thread.archivedAt) navigate(`/${filterQuery}`);
    } catch (err) {
      setHint(err instanceof Error ? err.message : "Falha ao arquivar.");
    }
  }

  const archived = Boolean(thread?.archivedAt);
  const status = thread ? conversationStatus(thread) : null;

  return (
    <section className="thread-pane">
      <header className="thread-pane__header">
        {showBackLink ? (
          <Link className="thread-pane__back" to={`/${filterQuery}`}>
            ← Conversas
          </Link>
        ) : null}
        <div className="thread-pane__identity">
          <div>
            <h1>{clientProfile?.name || thread?.clientLabel || "Conversa"}</h1>
            <p className="thread-pane__meta">
              {status ? (
                <span className={`conv-chip conv-chip--${status.kind}`}>
                  {status.label}
                </span>
              ) : null}
              {thread?.assignedConsultantName
                ? ` · ${thread.assignedConsultantName}`
                : ""}
            </p>
          </div>
        </div>
        <div className="thread-pane__actions">
          {reviewId && !archived ? (
            <button
              type="button"
              className="btn-soft btn-soft--sm"
              onClick={() =>
                void sendAutoReport(reviewId)
                  .then(() => setHint("Relatório automático enviado à cliente."))
                  .catch((err) =>
                    setHint(err instanceof Error ? err.message : "Falha"),
                  )
              }
            >
              Relatório automático
            </button>
          ) : null}
          <button
            type="button"
            className="btn-soft btn-soft--sm"
            onClick={() => void onToggleArchive()}
          >
            {archived ? "Desarquivar" : "Arquivar"}
          </button>
          {!archived ? (
            <button
              type="button"
              className="btn-soft btn-soft--sm"
              onClick={() => setShowTransfer(true)}
            >
              Encaminhar
            </button>
          ) : null}
        </div>
      </header>

      <ClientProfileCard
        profile={clientProfile}
        fallbackLabel={thread?.clientLabel || "Cliente"}
      />

      <div className="thread-feed" aria-live="polite">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onOpenLink={setPendingLink}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {!archived ? (
        <Composer
          sending={sending}
          hint={hint}
          onSend={onSend}
          onHint={setHint}
        />
      ) : (
        <p className="hint thread-pane__archived-hint">{hint}</p>
      )}

      {pendingLink ? (
        <ExternalLinkGate
          url={pendingLink}
          onCancel={() => setPendingLink(null)}
          onConfirm={() => {
            window.open(pendingLink, "_blank", "noopener,noreferrer");
            setPendingLink(null);
          }}
        />
      ) : null}

      {showTransfer ? (
        <TransferDialog
          peers={peers}
          onClose={() => setShowTransfer(false)}
          onConfirm={async (to, note) => {
            const res = await transferThread(threadId, to, note);
            setThread(res.thread);
            setHint("Conversa encaminhada.");
            const data = await getMessages(threadId);
            mergeMessages(data.messages);
            onThreadMetaChange?.();
          }}
        />
      ) : null}
    </section>
  );
}
