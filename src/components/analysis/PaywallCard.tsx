"use client";

import { useState } from "react";

export type PaywallCardProps = {
  analysisId: string;
  /** @default "Resultado completo" */
  offerLabel?: string;
  /** @default "R$ 97,00" */
  priceLabel?: string;
  /** @default "Liberar resultado completo" */
  ctaLabel?: string;
  onUnlock?: (analysisId: string) => void;
};

/**
 * Paywall card for locked content (confidence + 4 axes + basic palette).
 * FREE: station name only.
 * PAID: R$97 (provisional) unlocks confidence + 4 axes + basic palette together.
 */
export function PaywallCard({
  analysisId,
  offerLabel = "Resultado completo",
  priceLabel = "R$ 97,00",
  ctaLabel = "Liberar resultado completo",
  onUnlock,
}: PaywallCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleUnlock() {
    setLoading(true);
    try {
      // TODO: Call payment/unlock API when implementing paywall
      onUnlock?.(analysisId);
    } catch (err) {
      console.error("[PaywallCard] Failed to unlock:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="paywall-card">
      <div className="paywall-card__content">
        <h3 className="paywall-card__title">{offerLabel}</h3>
        <p className="paywall-card__desc">
          Desbloqueie confiança, análise por eixo e paleta básica de cores
        </p>
        <p className="paywall-card__price">{priceLabel}</p>
      </div>
      <button
        type="button"
        className="paywall-card__cta"
        onClick={handleUnlock}
        disabled={loading}
      >
        {loading ? "Processando..." : ctaLabel}
      </button>
    </div>
  );
}
