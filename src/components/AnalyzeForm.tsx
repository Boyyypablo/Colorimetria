"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ANALYSIS_GOAL_OPTIONS,
  DEFAULT_ANALYSIS_GOALS,
  type AnalysisGoalId,
} from "@/lib/color/goals";
import { PHOTO_QUALITY_TIPS } from "@/lib/color/photo-tips";
import {
  PaymentCheckout,
  type PaymentOrderView,
} from "@/components/payments/PaymentCheckout";
import { detectFaceInBrowser } from "@/lib/vision/face/browser";
import { coverFocusPosition } from "@/lib/vision/face/frame";

const CONTEXTS: Array<{
  id: "casual" | "trabalho" | "noite";
  label: string;
  sub: string;
}> = [
  { id: "casual", label: "Casual", sub: "Dia a dia, compras, passeios" },
  { id: "trabalho", label: "Trabalho", sub: "Reuniões, escritório, apresentações" },
  { id: "noite", label: "Noite", sub: "Eventos, jantares, celebrações" },
];

const INTENTION_MIN = 8;
const INTENTION_MAX = 600;

type FormState = "idle" | "sending" | "error";
type FaceStatus = "idle" | "locating" | "found" | "miss";

export function AnalyzeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get("orderId");
  const fileRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const frameGen = useRef(0);
  const photoUrlRef = useRef<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [objectPosition, setObjectPosition] = useState("50% 40%");
  const [faceStatus, setFaceStatus] = useState<FaceStatus>("idle");
  const [intention, setIntention] = useState("");
  const [goals, setGoals] = useState<AnalysisGoalId[]>([...DEFAULT_ANALYSIS_GOALS]);
  const [context, setContext] = useState<"casual" | "trabalho" | "noite" | "">("");
  const [lgpd, setLgpd] = useState(false);
  const [makeupOnPhoto, setMakeupOnPhoto] = useState(false);
  const [dyedHair, setDyedHair] = useState(false);
  const [artificialLight, setArtificialLight] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentsOn, setPaymentsOn] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfgRes = await fetch("/api/payments/config");
        const cfg = await cfgRes.json();
        if (cancelled) return;
        const enabled = Boolean(cfg.enabled);
        setPaymentsOn(enabled);
        if (!enabled) return;

        if (orderIdFromUrl) {
          const res = await fetch(`/api/payments/${orderIdFromUrl}?sync=1`);
          const data = await res.json();
          if (
            !cancelled &&
            res.ok &&
            data.order?.sku === "ANALYSIS" &&
            data.order?.status === "PAID" &&
            !data.order?.analysisId
          ) {
            setPaidOrderId(data.order.id);
            return;
          }
        }

        const listRes = await fetch("/api/payments");
        const list = await listRes.json();
        const orphan = Array.isArray(list.orders) ? list.orders[0] : null;
        if (!cancelled && orphan?.status === "PAID" && !orphan.analysisId) {
          setPaidOrderId(orphan.id);
        }
      } catch {
        if (!cancelled) setPaymentsOn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderIdFromUrl]);

  const onAnalysisPaid = useCallback((order: PaymentOrderView) => {
    setPaidOrderId(order.id);
  }, []);

  const trimmedIntention = intention.trim();
  const paymentOk = !paymentsOn || Boolean(paidOrderId);
  const canSubmit =
    Boolean(photoFile) &&
    faceStatus !== "locating" &&
    trimmedIntention.length >= INTENTION_MIN &&
    goals.length > 0 &&
    Boolean(context) &&
    lgpd &&
    paymentOk;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    const url = URL.createObjectURL(file);
    photoUrlRef.current = url;
    setPhotoFile(file);
    setPhotoUrl(url);
    setObjectPosition("50% 40%");
    setFaceStatus("locating");

    const gen = ++frameGen.current;
    try {
      const result = await detectFaceInBrowser(file);
      if (gen !== frameGen.current) return;
      const frame = dropzoneRef.current;
      const pos = coverFocusPosition(
        result.box.x + result.box.width / 2,
        result.box.y + result.box.height * 0.42,
        result.imageWidth,
        result.imageHeight,
        frame?.clientWidth ?? 640,
        frame?.clientHeight ?? 320,
      );
      setObjectPosition(`${pos.x}% ${pos.y}%`);
      setFaceStatus(result.found ? "found" : "miss");
    } catch {
      if (gen !== frameGen.current) return;
      setObjectPosition("50% 40%");
      setFaceStatus("miss");
    }
  }

  function toggleGoal(id: AnalysisGoalId) {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    if (!canSubmit || !photoFile || !context) return;
    setFormState("sending");
    setErrorMessage(null);

    const fd = new FormData();
    fd.set("image", photoFile);
    fd.set("biometricConsent", "true");
    fd.set("intention", trimmedIntention);
    fd.set("makeupOnPhoto", makeupOnPhoto ? "true" : "false");
    fd.set("dyedHair", dyedHair ? "true" : "false");
    fd.set("artificialLight", artificialLight ? "true" : "false");
    for (const g of goals) fd.append("goals", g);
    fd.set("context", context);
    if (paidOrderId) fd.set("paymentOrderId", paidOrderId);

    try {
      const res = await fetch("/api/analyses", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Não foi possível concluir a análise.");
        setFormState("error");
        if (data.code === "PAYMENT_REQUIRED") setPaidOrderId(null);
        return;
      }
      router.push(`/analyses/${data.analysis.id}`);
    } catch {
      setErrorMessage("Falha de conexão. Verifique sua internet e tente novamente.");
      setFormState("error");
    }
  }

  if (formState === "sending") {
    return (
      <div className="af-fullscreen">
        <div className="af-spinner" aria-hidden />
        <p className="af-fullscreen__title">Enviando sua análise…</p>
        <p className="af-fullscreen__text">
          Sua foto e informações estão sendo processadas com segurança.
        </p>
      </div>
    );
  }

  if (formState === "error") {
    return (
      <div className="af-fullscreen">
        <p className="af-fullscreen__title">Algo deu errado.</p>
        <p className="af-fullscreen__text">
          {errorMessage ||
            "Não foi possível enviar sua análise. Verifique sua conexão e tente novamente."}
        </p>
        <button
          type="button"
          className="af-fullscreen__btn"
          onClick={() => setFormState("idle")}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="af-shell">
      <div className="af-intro">
        <p className="af-eyebrow">Análise de cor pessoal</p>
        <h1 className="af-title">
          Vamos descobrir
          <br />
          <em>sua paleta.</em>
        </h1>
        <p className="af-lede">
          Envie sua foto e conte o que quer trabalhar. O sistema analisa a
          qualidade automaticamente; a equipe valida quando for necessário.
        </p>
      </div>

      <AfSection number="01" title="Sua foto" subtitle="A base da análise">
        <aside className="af-photo-guide" aria-label="O que mais importa na foto">
          <p className="af-photo-guide__label">Antes de enviar</p>
          <p className="af-photo-guide__lead">
            Para uma leitura mais fiel, estes pontos fazem mais diferença do
            que o resto:
          </p>
          <ul className="af-photo-guide__list">
            {PHOTO_QUALITY_TIPS.map((tip) => (
              <li key={tip.id}>
                <strong>{tip.label}</strong>
                <span>{tip.detail}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div
          ref={dropzoneRef}
          className={`af-dropzone ${photoUrl ? "af-dropzone--filled" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
          }}
        >
          {photoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Prévia da foto enviada"
                className="af-dropzone__preview"
                style={{ objectPosition }}
              />
              <div className="af-dropzone__swap">Trocar foto</div>
            </>
          ) : (
            <div className="af-dropzone__placeholder">
              <div className="af-dropzone__icon">◎</div>
              <p className="af-dropzone__placeholder-title">Enviar foto</p>
              <p className="af-dropzone__placeholder-hint">
                Clique para escolher · JPG ou PNG · até 8 MB
              </p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="af-dropzone__input"
          onChange={handleFile}
          aria-label="Foto do rosto"
        />

        {faceStatus === "locating" ? (
          <p className="af-auto-check af-auto-check--pending" role="status">
            Analisando a foto automaticamente…
          </p>
        ) : null}
        {faceStatus === "found" ? (
          <p className="af-auto-check af-auto-check--ok" role="status">
            Foto ok para seguir — localizamos o rosto. A qualidade fina
            (luz, nitidez) será conferida no servidor após o envio.
          </p>
        ) : null}
        {faceStatus === "miss" ? (
          <p className="af-auto-check af-auto-check--warn" role="status">
            Atenção: não localizamos bem o rosto. Prefira uma selfie frontal
            com boa luz — a leitura pode ficar provisória.
          </p>
        ) : null}

        <div className="af-bias">
          <p className="af-bias__label">Contexto opcional (ajuda a interpretação)</p>
          <label className="af-bias__item">
            <input
              type="checkbox"
              className="af-native-checkbox"
              checked={makeupOnPhoto}
              onChange={(e) => setMakeupOnPhoto(e.target.checked)}
            />
            <span>Estou maquiada nesta foto</span>
          </label>
          <label className="af-bias__item">
            <input
              type="checkbox"
              className="af-native-checkbox"
              checked={dyedHair}
              onChange={(e) => setDyedHair(e.target.checked)}
            />
            <span>O cabelo está tingido (não é a cor da raiz)</span>
          </label>
          <label className="af-bias__item">
            <input
              type="checkbox"
              className="af-native-checkbox"
              checked={artificialLight}
              onChange={(e) => setArtificialLight(e.target.checked)}
            />
            <span>A luz é artificial (lâmpada, não janela)</span>
          </label>
        </div>

        <div
          className={`af-consent af-consent--inline${!lgpd ? " af-consent--invalid" : ""}`}
          aria-invalid={!lgpd}
        >
          <label className="af-consent__row">
            <input
              type="checkbox"
              className="af-native-checkbox"
              checked={lgpd}
              required
              aria-required="true"
              aria-describedby="af-lgpd-alert"
              onChange={(e) => setLgpd(e.target.checked)}
            />
            <div>
              <p className="af-consent__title">
                Consinto com o uso da minha foto para análise de colorimetria
                pessoal (LGPD).{" "}
                <span className="af-consent__required" aria-hidden>
                  *
                </span>
              </p>
              <p className="af-consent__hint">
                Uso exclusivo desta análise, acesso restrito à equipe de
                validação, conforme a Lei nº 13.709/2018. Você pode pedir
                exclusão a qualquer momento.
              </p>
            </div>
          </label>
          {!lgpd ? (
            <p id="af-lgpd-alert" className="af-consent__alert" role="alert">
              Preenchimento obrigatório — marque o consentimento LGPD para
              continuar.
            </p>
          ) : (
            <p id="af-lgpd-alert" className="sr-only">
              Consentimento LGPD aceito.
            </p>
          )}
        </div>
      </AfSection>

      <AfSection
        number="02"
        title="O que você quer trabalhar?"
        subtitle="Em suas palavras"
      >
        <textarea
          className="af-textarea"
          value={intention}
          onChange={(e) => setIntention(e.target.value.slice(0, INTENTION_MAX))}
          minLength={INTENTION_MIN}
          maxLength={INTENTION_MAX}
          placeholder="Ex: Quero entender por que certas cores me deixam apagada e como usar mais cor no meu dia a dia sem parecer exagerada..."
        />
        <p className="af-textarea__counter">
          {intention.length} / {INTENTION_MAX}
        </p>
      </AfSection>

      <AfSection number="03" title="Áreas de foco" subtitle="Selecione uma ou mais">
        <div className="af-chips">
          {ANALYSIS_GOAL_OPTIONS.map((opt) => {
            const active = goals.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.hint}
                onClick={() => toggleGoal(opt.id)}
                className={`af-chip ${active ? "af-chip--active" : ""}`}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </AfSection>

      <AfSection
        number="04"
        title="Contexto principal"
        subtitle="Para qual ocasião analisar"
      >
        <div className="af-context-grid">
          {CONTEXTS.map((ctx) => {
            const active = context === ctx.id;
            return (
              <button
                key={ctx.id}
                type="button"
                onClick={() => setContext(ctx.id)}
                className={`af-context-card ${active ? "af-context-card--active" : ""}`}
                aria-pressed={active}
              >
                <p className="af-context-card__label">{ctx.label}</p>
                <p className="af-context-card__sub">{ctx.sub}</p>
              </button>
            );
          })}
        </div>
      </AfSection>

      {paymentsOn && paidOrderId ? (
        <div className="pay-box pay-box--ok" role="status">
          <p className="pay-box__eyebrow">Crédito disponível</p>
          <p className="pay-box__title">Análise já paga — envie a foto</p>
          <p className="pay-box__hint">
            Este pagamento ainda não foi usado. Ao enviar, o crédito é consumido
            automaticamente.
          </p>
        </div>
      ) : null}

      {paymentsOn && !paidOrderId ? (
        <AfSection
          number="05"
          title="Pagamento"
          subtitle="Libera o laudo completo"
        >
          <PaymentCheckout sku="ANALYSIS" onPaid={onAnalysisPaid} />
        </AfSection>
      ) : null}

      {errorMessage && <p className="af-error-banner">{errorMessage}</p>}

      <div className="af-submit">
        <button
          type="button"
          className="af-submit__btn"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Enviar para análise
        </button>
        {!canSubmit && (
          <p className="af-submit__hint">
            {paymentsOn && !paidOrderId
              ? "Confirme o pagamento da análise para enviar."
              : "Foto, intenção, áreas, contexto e consentimento LGPD são obrigatórios."}
          </p>
        )}
      </div>
    </div>
  );
}

function AfSection({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="af-section">
      <div className="af-section__head">
        <span className="af-section__number">{number}</span>
        <div>
          <h2 className="af-section__title">{title}</h2>
          <p className="af-section__subtitle">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
