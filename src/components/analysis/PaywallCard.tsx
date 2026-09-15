"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PaywallCardProps = {
  analysisId: string;
  /** @default "Resultado completo" */
  offerLabel?: string;
  /** @default "R$ 97,00" */
  priceLabel?: string;
  /** @default "Liberar resultado completo" */
  ctaLabel?: string;
  /** @default "Já comprei" */
  secondaryCtaLabel?: string;
};

type PaywallState = "initial" | "confirming" | "processing" | "success" | "error";

/**
 * Paywall card for locked content (confidence + 4 axes + basic palette).
 * 
 * Board v3 approved flow:
 * S1: CTA "Liberar resultado completo" + secondary "Já comprei"
 * S2: Title "Confirmar resultado completo" (payment/confirmation screen)
 * S4: "Resultado completo liberado" (success state)
 * 
 * FREE: station name only (never gate the name after successful analysis).
 * PAID: R$97 (provisional) unlocks confidence + 4 axes + basic palette together.
 * No paywall on reject or confidence <65%.
 */
export function PaywallCard({
  analysisId,
  offerLabel = "Resultado completo",
  priceLabel = "R$ 97,00",
  ctaLabel = "Liberar resultado completo",
  secondaryCtaLabel = "Já comprei",
}: PaywallCardProps) {
  const router = useRouter();
  const [state, setState] = useState<PaywallState>("initial");
  const [error, setError] = useState<string | null>(null);

  async function handleProceedToPayment() {
    setState("confirming");
  }

  async function handleAlreadyPurchased() {
    setState("processing");
    setError(null);

    try {
      const res = await fetch(`/api/analyses/${analysisId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentRef: "already-purchased" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao verificar pagamento");
      }

      setState("success");
      // Refresh page to show unlocked content
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("[PaywallCard] Already purchased error:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setState("error");
    }
  }

  async function handleConfirmPayment() {
    setState("processing");
    setError(null);

    try {
      // TODO: Integrate with Stripe/Pagar.me
      // For now, mock unlock immediately
      const res = await fetch(`/api/analyses/${analysisId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentRef: `mock-${Date.now()}` }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar pagamento");
      }

      setState("success");
      // Refresh page to show unlocked content
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("[PaywallCard] Payment error:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setState("error");
    }
  }

  function handleBack() {
    setState("initial");
    setError(null);
  }

  // S4: Success state
  if (state === "success") {
    return (
      <div className="paywall-card paywall-card--success">
        <div className="paywall-card__content">
          <h3 className="paywall-card__title">Resultado completo liberado</h3>
          <p className="paywall-card__desc">
            Atualizando página...
          </p>
        </div>
      </div>
    );
  }

  // S2: Confirmation state
  if (state === "confirming") {
    return (
      <div className="paywall-card paywall-card--confirm">
        <div className="paywall-card__content">
          <h3 className="paywall-card__title">Confirmar resultado completo</h3>
          <p className="paywall-card__desc">
            Desbloqueie confiança, análise por eixo e paleta básica de cores
          </p>
          <p className="paywall-card__price">{priceLabel}</p>
          {error && <p className="paywall-card__error">{error}</p>}
        </div>
        <div className="paywall-card__actions">
          <button
            type="button"
            className="paywall-card__cta"
            onClick={handleConfirmPayment}
            disabled={state === "processing" || state === "confirming"}
          >
            {state === "processing" ? "Processando..." : "Confirmar pagamento"}
          </button>
          <button
            type="button"
            className="paywall-card__cta paywall-card__cta--secondary"
            onClick={handleBack}
            disabled={state === "processing" || state === "confirming"}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // S1: Initial state
  return (
    <div className="paywall-card">
      <div className="paywall-card__content">
        <h3 className="paywall-card__title">{offerLabel}</h3>
        <p className="paywall-card__desc">
          Desbloqueie confiança, análise por eixo e paleta básica de cores
        </p>
        <p className="paywall-card__price">{priceLabel}</p>
        {error && <p className="paywall-card__error">{error}</p>}
      </div>
      <div className="paywall-card__actions">
        <button
          type="button"
          className="paywall-card__cta"
          onClick={handleProceedToPayment}
          disabled={state === "processing"}
        >
          {state === "processing" ? "Processando..." : ctaLabel}
        </button>
        <button
          type="button"
          className="paywall-card__cta paywall-card__cta--secondary"
          onClick={handleAlreadyPurchased}
          disabled={state === "processing"}
        >
          {secondaryCtaLabel}
        </button>
      </div>
    </div>
  );
}
