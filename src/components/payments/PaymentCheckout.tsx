"use client";

import { useCallback, useEffect, useState } from "react";

export type PaymentOrderView = {
  id: string;
  sku: "ANALYSIS" | "REVIEW";
  amountCents: number;
  currency: string;
  status: string;
  billingType: string | null;
  invoiceUrl: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  analysisId: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type Config = {
  enabled: boolean;
  analysisPriceCents: number;
  reviewPriceCents: number;
  analysisPriceLabel: string;
  reviewPriceLabel: string;
};

type Props = {
  sku: "ANALYSIS" | "REVIEW";
  analysisId?: string;
  title?: string;
  onPaid: (order: PaymentOrderView) => void;
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PaymentCheckout({ sku, analysisId, title, onPaid }: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [order, setOrder] = useState<PaymentOrderView | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/payments/config");
      const data = (await res.json()) as Config;
      if (!cancelled) setConfig(data);
    })().catch(() => {
      if (!cancelled) setConfig({ enabled: false, analysisPriceCents: 6700, reviewPriceCents: 12900, analysisPriceLabel: "R$ 67,00", reviewPriceLabel: "R$ 129,00" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config?.enabled) return;
    let cancelled = false;
    const qs = new URLSearchParams({ sku });
    if (analysisId) qs.set("analysisId", analysisId);
    (async () => {
      const res = await fetch(`/api/payments?${qs}`);
      const data = await res.json();
      if (cancelled || !data.order) return;
      setOrder(data.order);
      if (data.order.status === "PAID") onPaid(data.order);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [config?.enabled, sku, analysisId, onPaid]);

  const pollPaid = useCallback(
    async (orderId: string) => {
      setSyncing(true);
      setError(null);
      try {
        const res = await fetch(`/api/payments/${orderId}?sync=1`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Não foi possível verificar o pagamento.");
          return;
        }
        setOrder(data.order);
        if (data.order?.status === "PAID") onPaid(data.order);
      } catch {
        setError("Falha de conexão ao verificar pagamento.");
      } finally {
        setSyncing(false);
      }
    },
    [onPaid],
  );

  useEffect(() => {
    if (!order || order.status === "PAID") return;
    if (order.status !== "AWAITING_PAYMENT" && order.status !== "PENDING") return;
    const t = setInterval(() => {
      void pollPaid(order.id);
    }, 4000);
    return () => clearInterval(t);
  }, [order, pollPaid]);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          analysisId: analysisId || null,
          cpfCnpj,
          billingType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível criar a cobrança.");
        return;
      }
      setOrder(data.order);
      if (data.order.status === "PAID") onPaid(data.order);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPix() {
    if (!order?.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(order.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar o código Pix.");
    }
  }

  if (config && !config.enabled) {
    return null;
  }

  const priceLabel =
    sku === "ANALYSIS"
      ? config?.analysisPriceLabel || formatCents(6700)
      : config?.reviewPriceLabel || formatCents(12900);

  const heading =
    title ||
    (sku === "ANALYSIS"
      ? `Análise completa — ${priceLabel}`
      : `Revisão com consultora — ${priceLabel}`);

  if (order?.status === "PAID") {
    return (
      <div className="pay-box pay-box--ok">
        <p className="pay-box__eyebrow">Pagamento confirmado</p>
        <p className="pay-box__title">{heading}</p>
        <p className="pay-box__hint">Pode seguir com o próximo passo.</p>
      </div>
    );
  }

  return (
    <div className="pay-box">
      <p className="pay-box__eyebrow">Pagamento seguro · Asaas</p>
      <h2 className="pay-box__title">{heading}</h2>
      <p className="pay-box__hint">
        {sku === "ANALYSIS"
          ? "Foto validada. O pagamento libera a cartela completa, plano personalizado e 7 dias de chat com a consultora."
          : "O pagamento libera a revisão humana na fila da consultora e mantém o chat particular aberto."}
      </p>

      {!order || order.status === "CANCELLED" || order.status === "EXPIRED" ? (
        <div className="pay-box__form">
          <label className="pay-box__label">
            CPF ou CNPJ
            <input
              className="input pay-box__input"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Somente números"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
            />
          </label>
          <div className="pay-box__billing" role="group" aria-label="Forma de pagamento">
            <button
              type="button"
              className={`pay-box__chip ${billingType === "PIX" ? "pay-box__chip--on" : ""}`}
              onClick={() => setBillingType("PIX")}
            >
              Pix
            </button>
            <button
              type="button"
              className={`pay-box__chip ${billingType === "CREDIT_CARD" ? "pay-box__chip--on" : ""}`}
              onClick={() => setBillingType("CREDIT_CARD")}
            >
              Cartão
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || cpfCnpj.replace(/\D/g, "").length < 11}
            onClick={() => void startCheckout()}
          >
            {loading ? "Gerando cobrança…" : `Pagar ${priceLabel}`}
          </button>
        </div>
      ) : (
        <div className="pay-box__pending">
          {order.pixQrCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="pay-box__qr"
              alt="QR Code Pix"
              src={
                order.pixQrCode.startsWith("data:")
                  ? order.pixQrCode
                  : `data:image/png;base64,${order.pixQrCode}`
              }
            />
          ) : null}
          {order.pixCopyPaste ? (
            <button type="button" className="btn btn-ghost" onClick={() => void copyPix()}>
              {copied ? "Copiado!" : "Copiar código Pix"}
            </button>
          ) : null}
          {order.invoiceUrl ? (
            <a
              className="btn btn-primary"
              href={order.invoiceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir fatura Asaas
            </a>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={syncing}
            onClick={() => void pollPaid(order.id)}
          >
            {syncing ? "Verificando…" : "Já paguei — verificar"}
          </button>
          <p className="pay-box__status">
            Status: {order.status}. Se o Pix já caiu e ainda não liberou, use
            “verificar” — o webhook às vezes atrasa alguns segundos. Atualizamos
            sozinhas a cada 4s.
          </p>
        </div>
      )}

      {error ? <p className="pay-box__error">{error}</p> : null}

      <p className="pay-box__legal">
        Garantia de 7 dias (CDC Art. 49): você tem até 7 dias corridos após a
        compra para solicitar cancelamento e reembolso integral.
      </p>
    </div>
  );
}
