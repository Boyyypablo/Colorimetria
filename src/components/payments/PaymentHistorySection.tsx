import Link from "next/link";
import { formatBrlFromCents } from "@/lib/payments/config";

export type PaymentHistoryItem = {
  id: string;
  sku: "ANALYSIS" | "REVIEW";
  amountCents: number;
  status: string;
  billingType: string | null;
  invoiceUrl: string | null;
  analysisId: string | null;
  paidAt: string | null;
  createdAt: string;
  canResume: boolean;
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  PAID: { label: "Pago", tone: "ok" },
  AWAITING_PAYMENT: { label: "Aguardando pagamento", tone: "pending" },
  PENDING: { label: "Em processamento", tone: "pending" },
  EXPIRED: { label: "Expirado", tone: "muted" },
  CANCELLED: { label: "Cancelado", tone: "muted" },
  REFUNDED: { label: "Reembolsado", tone: "muted" },
};

const BILLING_LABEL: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão",
  UNDEFINED: "Pix ou cartão",
};

export function PaymentHistorySection({
  orders,
  paymentsOn,
}: {
  orders: PaymentHistoryItem[];
  paymentsOn: boolean;
}) {
  return (
    <div className="card mx-auto w-full max-w-lg space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
          Cobranças e recibos
        </p>
        <h2 className="font-display text-2xl">Meus pagamentos</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Acompanhe o status das suas cobranças Pix e cartão, retome pagamentos
          pendentes ou acesse sua cartela liberada.
        </p>
      </div>

      {!paymentsOn ? (
        <p className="pay-beta-note">
          Acesso beta gratuito ativo — durante os testes, a liberação de
          cartelas e revisões está aberta sem cobrança.
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Nenhum pagamento registrado ainda.
        </p>
      ) : (
        <ul className="pay-history">
          {orders.map((order) => {
            const st = STATUS_LABEL[order.status] ?? {
              label: order.status,
              tone: "muted",
            };

            return (
              <li key={order.id} className="pay-history__item">
                <div className="pay-history__head">
                  <div>
                    <p className="pay-history__title">
                      {order.sku === "ANALYSIS"
                        ? "Cartela de cores"
                        : "Revisão humana"}
                    </p>
                    <p className="pay-history__meta">
                      {formatBrlFromCents(order.amountCents)}
                      {order.billingType
                        ? ` · ${BILLING_LABEL[order.billingType] || order.billingType}`
                        : ""}
                      {" · "}
                      {new Date(order.paidAt || order.createdAt).toLocaleDateString(
                        "pt-BR",
                      )}
                    </p>
                  </div>
                  <span className={`pay-history__badge pay-history__badge--${st.tone}`}>
                    {st.label}
                  </span>
                </div>

                <div className="pay-history__actions">
                  {order.canResume && order.invoiceUrl ? (
                    <a
                      href={order.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                    >
                      Retomar pagamento
                    </a>
                  ) : null}
                  {order.analysisId ? (
                    <Link
                      href={`/analyses/${order.analysisId}`}
                      className="btn btn-ghost"
                    >
                      {order.status === "PAID"
                        ? "Abrir cartela"
                        : "Ver leitura"}
                    </Link>
                  ) : order.sku === "ANALYSIS" && order.status === "PAID" ? (
                    <Link
                      href={`/analyze?orderId=${order.id}`}
                      className="btn btn-primary"
                    >
                      Usar crédito na análise
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="pay-box__legal">
        Garantia de 7 dias (CDC Art. 49): você pode solicitar cancelamento e
        reembolso integral em até 7 dias corridos após a compra.
      </p>
    </div>
  );
}
