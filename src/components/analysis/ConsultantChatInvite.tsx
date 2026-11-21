"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PaymentCheckout } from "@/components/payments/PaymentCheckout";

type ChatMessage = {
  id: string;
  role: "user" | "consultant" | "system";
  body: string;
  createdAt: string;
};

type ChatAccess = {
  canSend: boolean;
  reason: "trial" | "paid" | "expired" | "payments_off";
  trialEndsAt: string;
  daysLeft: number;
};

type Props = {
  analysisId: string;
  consultantName?: string | null;
  seasonName?: string | null;
};

function accessNote(access: ChatAccess | null): string | null {
  if (!access) return null;
  if (access.reason === "trial") {
    const days = access.daysLeft === 1 ? "1 dia" : `${access.daysLeft} dias`;
    return `Chat incluso por ${days}. Depois, a conversa continua com o pagamento da revisão.`;
  }
  if (access.reason === "paid") return "Conversa liberada com a revisão paga.";
  if (access.reason === "expired") {
    return "Sua semana de chat acabou. Pague a revisão para continuar falando com a consultora.";
  }
  return null;
}

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
  const [access, setAccess] = useState<ChatAccess | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/analyses/${analysisId}/chat`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages: ChatMessage[];
          access?: ChatAccess;
        };
        if (!cancelled) {
          setMessages(data.messages);
          if (data.access) setAccess(data.access);
        }
      } catch {
        // silencioso no primeiro load
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
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
        code?: string;
        access?: ChatAccess;
        message?: ChatMessage;
        messages?: ChatMessage[];
      };
      if (data.access) setAccess(data.access);
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
        medida para cabelo, maquiagem e guarda-roupa{seasonBit}? A conversa
        fica aberta por uma semana depois do cadastro. Depois disso, segue
        com o pagamento da revisão.
      </p>
      {accessNote(access) ? (
        <p className="ar-concierge__lead">{accessNote(access)}</p>
      ) : null}

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

          {access && !access.canSend ? (
            <div className="ar-concierge__composer">
              <PaymentCheckout
                sku="REVIEW"
                analysisId={analysisId}
                title="Continuar a conversa"
                onPaid={() =>
                  setAccess((prev) =>
                    prev ? { ...prev, canSend: true, reason: "paid" } : prev,
                  )
                }
              />
            </div>
          ) : (
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
          )}
        </div>
      )}
    </section>
  );
}
