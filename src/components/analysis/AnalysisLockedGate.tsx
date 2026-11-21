"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaymentCheckout } from "@/components/payments/PaymentCheckout";

type Props = {
  analysisId: string;
  photoUrl: string;
  mode: "needs_retake" | "payment_required";
  failedTips: string[];
  priceLabel: string;
};

export function AnalysisLockedGate({
  analysisId,
  photoUrl,
  mode,
  failedTips,
  priceLabel,
}: Props) {
  const router = useRouter();

  if (mode === "needs_retake") {
    return (
      <section className="shell pay-gate" aria-labelledby="retake-heading">
        <div className="pay-gate__card">
          <div className="pay-gate__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Foto enviada para validação"
              className="pay-gate__photo"
            />
          </div>
          <div className="pay-gate__body">
            <p className="pay-gate__eyebrow pay-gate__eyebrow--warn">
              Troca gratuita de foto
            </p>
            <h1 id="retake-heading" className="font-display pay-gate__title">
              Esta foto precisa de ajuste antes da cobrança
            </h1>
            <p className="pay-gate__lead">
              Não cobramos nada quando a foto não tem luz ou enquadramento
              suficientes para uma leitura fiel. Envie outra foto gratuitamente
              seguindo as dicas abaixo.
            </p>
            {failedTips.length > 0 ? (
              <ul className="pay-gate__list">
                {failedTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            ) : (
              <ul className="pay-gate__list">
                <li>Prefira luz natural de frente (próximo a uma janela).</li>
                <li>Deixe o rosto centralizado, sem sombras fortes ou filtros.</li>
              </ul>
            )}
            <div className="pay-gate__actions">
              <Link href="/analyze" className="btn btn-primary">
                Enviar outra foto gratuitamente
              </Link>
              <Link href="/dashboard" className="btn btn-ghost">
                Voltar para minhas cartelas
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="shell pay-gate" aria-labelledby="locked-heading">
      <div className="pay-gate__card">
        <div className="pay-gate__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Foto validada para análise"
            className="pay-gate__photo"
          />
          <span className="pay-gate__badge">Foto aprovada</span>
        </div>
        <div className="pay-gate__body">
          <p className="pay-gate__eyebrow">Leitura pronta</p>
          <h1 id="locked-heading" className="font-display pay-gate__title">
            Sua cartela foi gerada e está pronta para liberação
          </h1>
          <p className="pay-gate__lead">
            Validamos sua foto com sucesso. Desbloqueie o laudo completo por{" "}
            <strong>{priceLabel}</strong> (pagamento único):
          </p>
          <ul className="pay-gate__list">
            <li>Sua estação pessoal entre as 12 cartelas de colorimetria</li>
            <li>Eixos detalhados: temperatura, valor, croma e contraste</li>
            <li>Paleta completa de cores para usar e cores para evitar</li>
            <li>Orientações práticas para maquiagem, cabelo, estilo e pele</li>
            <li>7 dias de chat particular com a consultora inclusos</li>
          </ul>

          <PaymentCheckout
            sku="ANALYSIS"
            analysisId={analysisId}
            title={`Liberar cartela completa — ${priceLabel}`}
            onPaid={() => router.refresh()}
          />

          <p className="pay-gate__retake-link">
            Quer tentar com outra foto antes de pagar?{" "}
            <Link href="/analyze">Enviar outra foto gratuitamente</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
