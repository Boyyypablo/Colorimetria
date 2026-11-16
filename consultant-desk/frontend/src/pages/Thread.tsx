import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLinkGate } from "../components/ExternalLinkGate";
import {
  archiveThread,
  getMessages,
  listPeerConsultants,
  listPendingReviews,
  openThreadStream,
  postMessage,
  sendAutoReport,
  transferThread,
  unarchiveThread,
  type ChatMessage,
  type DeskPeer,
  type ThreadSummary,
} from "../lib/chat-client";

type PendingAttach = {
  kind: "image" | "document";
  name: string;
  mime: string;
  dataUrl: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export function ThreadPage() {
  const { threadId = "" } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<ThreadSummary | null>(null);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttach[]>([]);
  const [hint, setHint] = useState("Conectando…");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [peers, setPeers] = useState<DeskPeer[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferNote, setTransferNote] = useState("");
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
    if (!threadId) return;
    let stopPoll: (() => void) | undefined;
    let es: EventSource | undefined;
    let cancelled = false;

    (async () => {
      try {
        const data = await getMessages(threadId);
        if (cancelled) return;
        mergeMessages(data.messages);
        if (data.thread) setThread(data.thread);
        setHint(
          data.thread?.archivedAt
            ? "Conversa arquivada (somente leitura até desarquivar)."
            : "Chat ativo",
        );
        const [reviews, peerList] = await Promise.all([
          listPendingReviews(),
          listPeerConsultants().catch(() => ({ consultants: [] as DeskPeer[] })),
        ]);
        const match = reviews.items.find((r) => r.threadId === threadId);
        if (match) setReviewId(match.id);
        setPeers(peerList.consultants);
        setTransferTo(peerList.consultants[0]?.id || "");
      } catch {
        setHint("Não foi possível carregar mensagens.");
      }
    })();

    try {
      es = openThreadStream(threadId);
      es.addEventListener("message", (ev) => {
        try {
          const msg = JSON.parse(ev.data) as ChatMessage;
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
  }, [threadId, mergeMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: PendingAttach[] = [];
    for (const file of [...files].slice(0, 3)) {
      if (file.size > 2 * 1024 * 1024) {
        setHint("Cada anexo deve ter no máximo 2 MB.");
        continue;
      }
      const dataUrl = await fileToDataUrl(file);
      next.push({
        kind: file.type.startsWith("image/") ? "image" : "document",
        name: file.name,
        mime: file.type || "application/octet-stream",
        dataUrl,
      });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 3));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!threadId || sending || thread?.archivedAt) return;
    if (!body.trim() && attachments.length === 0) return;
    setSending(true);
    try {
      const res = await postMessage(threadId, body.trim(), attachments);
      mergeMessages([res.message]);
      setBody("");
      setAttachments([]);
      setHint("Mensagem enviada.");
      setThread((prev) =>
        prev
          ? { ...prev, unreadForConsultant: 0, status: "open" }
          : prev,
      );
    } catch (err) {
      setHint(err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setSending(false);
    }
  }

  async function onToggleArchive() {
    if (!threadId || !thread) return;
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
      if (res.thread.archivedAt) navigate("/");
    } catch (err) {
      setHint(err instanceof Error ? err.message : "Falha ao arquivar.");
    }
  }

  async function onTransfer(e: FormEvent) {
    e.preventDefault();
    if (!threadId || !transferTo) return;
    try {
      const res = await transferThread(
        threadId,
        transferTo,
        transferNote || undefined,
      );
      setThread(res.thread);
      setShowTransfer(false);
      setHint("Conversa encaminhada.");
      const data = await getMessages(threadId);
      mergeMessages(data.messages);
    } catch (err) {
      setHint(err instanceof Error ? err.message : "Falha ao encaminhar.");
    }
  }

  const archived = Boolean(thread?.archivedAt);

  return (
    <section className="panel thread-panel">
      <p>
        <Link to="/">← Inbox</Link>
      </p>
      <div className="thread-toolbar">
        <div>
          <h1>{thread?.clientLabel || "Conversa"}</h1>
          <p className="empty">
            {archived
              ? "Arquivada"
              : thread?.unreadForConsultant
                ? `${thread.unreadForConsultant} não lida(s)`
                : "Sem notificação pendente"}
            {thread?.assignedConsultantName
              ? ` · Responsável: ${thread.assignedConsultantName}`
              : ""}
          </p>
        </div>
        <div className="thread-toolbar__actions">
          {reviewId && !archived ? (
            <button
              type="button"
              className="btn-soft"
              onClick={() =>
                void sendAutoReport(reviewId)
                  .then(() => setHint("Relatório automático enviado à cliente."))
                  .catch((err) =>
                    setHint(err instanceof Error ? err.message : "Falha"),
                  )
              }
            >
              Enviar relatório automático
            </button>
          ) : null}
          <button type="button" className="btn-soft" onClick={() => void onToggleArchive()}>
            {archived ? "Desarquivar" : "Arquivar"}
          </button>
          {!archived ? (
            <button
              type="button"
              className="btn-soft"
              onClick={() => setShowTransfer(true)}
            >
              Encaminhar
            </button>
          ) : null}
        </div>
      </div>

      <div className="thread-feed" aria-live="polite">
        {messages.map((m) => (
          <article key={m.id} className={`bubble bubble--${m.role}`}>
            <p className="bubble__role">{m.role}</p>
            <p className="bubble__body">{m.body}</p>
            {m.attachments?.map((a) =>
              a.kind === "image" ? (
                <img
                  key={a.id}
                  src={a.url}
                  className="bubble__img"
                  alt={a.name}
                />
              ) : (
                <a
                  key={a.id}
                  className="bubble__doc"
                  href={a.url}
                  download={a.name}
                >
                  📎 {a.name}
                </a>
              ),
            )}
            {m.externalLinks?.map((url) => (
              <button
                key={url}
                type="button"
                className="bubble__link"
                onClick={() => setPendingLink(url)}
              >
                {url}
              </button>
            ))}
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      {!archived ? (
        <form className="composer" onSubmit={onSubmit}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Responda a cliente… Links ok (Instagram etc.). Sem telefone ou e-mail."
          />
          {attachments.length > 0 ? (
            <ul className="composer__attach">
              {attachments.map((a) => (
                <li key={a.name + a.mime}>{a.name}</li>
              ))}
            </ul>
          ) : null}
          <div className="composer__row">
            <label className="btn-soft file-btn">
              Foto / documento
              <input
                type="file"
                accept="image/*,.pdf,.txt,.doc,.docx"
                multiple
                hidden
                onChange={(e) => void onPickFiles(e.target.files)}
              />
            </label>
            <button type="submit" disabled={sending}>
              {sending ? "Enviando…" : "Enviar à cliente"}
            </button>
          </div>
          <p className="hint">{hint}</p>
        </form>
      ) : (
        <p className="hint">{hint}</p>
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
        <div className="link-gate" role="dialog" aria-modal="true">
          <form className="link-gate__card" onSubmit={(e) => void onTransfer(e)}>
            <p className="link-gate__eyebrow">Encaminhar</p>
            <h2>Transferir esta conversa</h2>
            {peers.length === 0 ? (
              <p className="empty">Cadastre outra consultora para transferir.</p>
            ) : (
              <>
                <label className="auth-form">
                  Destino
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    required
                  >
                    {peers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-form">
                  Nota
                  <input
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    maxLength={500}
                  />
                </label>
              </>
            )}
            <div className="link-gate__actions">
              <button
                type="button"
                className="link-gate__secondary"
                onClick={() => setShowTransfer(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="link-gate__primary"
                disabled={!transferTo || peers.length === 0}
              >
                Confirmar encaminhamento
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
