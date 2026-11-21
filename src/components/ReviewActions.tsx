"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import {
  PaymentCheckout,
  type PaymentOrderView,
} from "@/components/payments/PaymentCheckout";

type Season = { id: string; namePt: string };

export function RequestReviewButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentsOn, setPaymentsOn] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPaymentsOn(Boolean(data.enabled));
      })
      .catch(() => {
        if (!cancelled) setPaymentsOn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitReview = useCallback(
    async (orderId: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analyses/${analysisId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "request_review",
            paymentOrderId: orderId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.code === "PAYMENT_REQUIRED") {
            setShowCheckout(true);
            setPaidOrderId(null);
          }
          setError(data.error || "Não foi possível solicitar a revisão.");
          return;
        }
        setShowCheckout(false);
        router.refresh();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [analysisId, router],
  );

  const onReviewPaid = useCallback(
    (order: PaymentOrderView) => {
      setPaidOrderId(order.id);
      void submitReview(order.id);
    },
    [submitReview],
  );

  async function request() {
    if (paymentsOn && !paidOrderId) {
      setShowCheckout(true);
      return;
    }
    await submitReview(paidOrderId);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void request()}
        disabled={loading}
      >
        {loading
          ? "Solicitando…"
          : paymentsOn && !paidOrderId
            ? "Pagar e pedir revisão"
            : "Pedir revisão da consultora"}
      </button>
      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
      {showCheckout && paymentsOn ? (
        <PaymentCheckout
          sku="REVIEW"
          analysisId={analysisId}
          onPaid={onReviewPaid}
        />
      ) : null}
    </div>
  );
}

export function ConsultantReviewForm({
  analysisId,
  seasons,
  currentSeasonId,
}: {
  analysisId: string;
  seasons: Season[];
  currentSeasonId?: string | null;
}) {
  const router = useRouter();
  const [seasonId, setSeasonId] = useState(currentSeasonId || seasons[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/consultant/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisId,
        overrideSeasonId: seasonId,
        notes,
        approved: true,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Não foi possível salvar a revisão.");
      return;
    }
    setMsg("Relatório aprovado.");
    router.push("/consultant");
    router.refresh();
  }

  return (
    <div className="card space-y-3 border-[var(--accent)]">
      <h2 className="font-display text-xl">Revisão da consultora</h2>
      <select
        className="input"
        value={seasonId}
        onChange={(e) => setSeasonId(e.target.value)}
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.namePt}
          </option>
        ))}
      </select>
      <Textarea
        className="min-h-24 bg-[#fffdf9]"
        placeholder="Notas para a usuária"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button type="button" className="btn btn-primary" onClick={submit} disabled={loading}>
        {loading ? "Salvando…" : "Aprovar com esta estação"}
      </button>
      {msg && <p className="text-sm text-[var(--ok)]">{msg}</p>}
    </div>
  );
}
