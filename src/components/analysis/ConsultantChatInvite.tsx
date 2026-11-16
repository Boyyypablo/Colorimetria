"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "consultant" | "system";
  body: string;
  createdAt: string;
};

type Props = {
  analysisId: string;
  consultantName?: string | null;
  seasonName?: string | null;
};

export function ConsultantChatInvite({
  analysisId,
  consultantName,
  seasonName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/analyses/${analysisId}/chat`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages: ChatMessage[] };
        if (!cancelled) setMessages(data.messages);
      } catch {
        // silencioso no primeiro load
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, analysisId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/analyses/${analysisId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: ChatMessage;
        messages?: ChatMessage[];
      };
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível enviar.");
      }
      if (data.messages) setMessages(data.messages);
      else if (data.message) setMessages((prev) => [...prev, data.message!]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setSending(false);
    }
  }

  const who = consultantName?.trim() || "sua consultora";
  const seasonBit = seasonName
    ? ` com base na sua leitura de ${seasonName}`
    : "";

  return (
    <section id="consultora" className="ar-concierge" aria-labelledby="concierge-heading">
      <div className="ar-concierge__glow" aria-hidden />
      <p className="ar-concierge__eyebrow">Atendimento reservado</p>
      <h2 id="concierge-heading" className="ar-concierge__title">
        Um canal só seu com {who}
      </h2>
      <p className="ar-concierge__lead">
        Quer afinar a cartela, remodelar um look ou receber orientações sob
        medida para cabelo, maquiagem e guarda-roupa{seasonBit}? Abra a
        conversa particular — cuidado contínuo, no ritmo dela e no seu.
      </p>

      {!open ? (
        <button
          type="button"
          className="ar-concierge__cta"
          onClick={() => setOpen(true)}
        >
          Abrir conversa particular
        </button>
      ) : (
        <div className="ar-concierge__chat" role="region" aria-label="Chat com a consultora">
          <div className="ar-concierge__chat-head">
            <div>
              <p className="ar-concierge__chat-name">{who}</p>
              <p className="ar-concierge__chat-status">Resposta em horário comercial</p>
            </div>
            <button
              type="button"
              className="ar-concierge__close"
              onClick={() => setOpen(false)}
            >
              Recolher
            </button>
          </div>

          <div className="ar-concierge__thread">
            {messages.length === 0 ? (
              <p className="ar-concierge__empty">
                Escreva a primeira mensagem. Sem telefone, e-mail ou redes —
                tudo fica nesta conversa.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`ar-concierge__bubble ar-concierge__bubble--${m.role}`}
                >
                  <p>{m.body}</p>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <form className="ar-concierge__composer" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor={`chat-${analysisId}`}>
              Mensagem para a consultora
            </label>
            <textarea
              id={`chat-${analysisId}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ex.: Quero ajustar o batom para o dia a dia…"
              required
            />
            {error ? <p className="ar-concierge__error">{error}</p> : null}
            <button type="submit" disabled={sending || !body.trim()}>
              {sending ? "Enviando…" : "Enviar à consultora"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
