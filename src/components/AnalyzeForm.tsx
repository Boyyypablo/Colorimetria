"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ANALYSIS_GOAL_OPTIONS,
  DEFAULT_ANALYSIS_GOALS,
  type AnalysisGoalId,
} from "@/lib/color/goals";
import { PHOTO_QUALITY_TIPS } from "@/lib/color/photo-tips";
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

export function AnalyzeForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const frameGen = useRef(0);
  const photoUrlRef = useRef<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [objectPosition, setObjectPosition] = useState("50% 40%");
  const [faceStatus, setFaceStatus] = useState<"idle" | "locating" | "found" | "miss">(
    "idle",
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [intention, setIntention] = useState("");
  const [goals, setGoals] = useState<AnalysisGoalId[]>([...DEFAULT_ANALYSIS_GOALS]);
  const [context, setContext] = useState<"casual" | "trabalho" | "noite" | "">("");
  const [lgpd, setLgpd] = useState(false);
  const [makeupOnPhoto, setMakeupOnPhoto] = useState(false);
  const [dyedHair, setDyedHair] = useState(false);
  const [artificialLight, setArtificialLight] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allTipsConfirmed = PHOTO_QUALITY_TIPS.every((tip) => checklist[tip.id]);
  const trimmedIntention = intention.trim();
  const canSubmit =
    Boolean(photoFile) &&
    allTipsConfirmed &&
    trimmedIntention.length >= INTENTION_MIN &&
    goals.length > 0 &&
    Boolean(context) &&
    lgpd;

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
    fd.set("photoTipsConfirmed", "true");
    fd.set("intention", trimmedIntention);
    fd.set("makeupOnPhoto", makeupOnPhoto ? "true" : "false");
    fd.set("dyedHair", dyedHair ? "true" : "false");
    fd.set("artificialLight", artificialLight ? "true" : "false");
    for (const g of goals) fd.append("goals", g);
    fd.set("context", context);

    try {
      const res = await fetch("/api/analyses", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Não foi possível concluir a análise.");
        setFormState("error");
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
          Envie sua foto e conte o que quer trabalhar. Nossa consultora
          revisará cada detalhe com cuidado — sem pressa.
        </p>
      </div>

      {/* 01 — Foto */}
      <AfSection number="01" title="Sua foto" subtitle="A base da análise">
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
              {faceStatus === "locating" ? (
                <p className="af-dropzone__face-status">A localizar o rosto…</p>
              ) : null}
              {faceStatus === "miss" ? (
                <p className="af-dropzone__face-status">
                  Não localizamos o rosto — a leitura fica provisória até uma selfie frontal.
                </p>
              ) : null}
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

        <div className="af-checklist">
          <p className="af-checklist__label">Confirme a qualidade da foto</p>
          {PHOTO_QUALITY_TIPS.map((tip) => (
            <label key={tip.id} className="af-checklist__item">
              <input
                type="checkbox"
                className="af-native-checkbox"
                checked={Boolean(checklist[tip.id])}
                onChange={(e) =>
                  setChecklist((prev) => ({ ...prev, [tip.id]: e.target.checked }))
                }
              />
              <span className="af-checklist__text">{tip.label}</span>
            </label>
          ))}
        </div>

        <div className="af-checklist">
          <p className="af-checklist__label">O que pode enviesar a medição</p>
          <label className="af-checklist__item">
            <input
              type="checkbox"
              className="af-native-checkbox"
              checked={makeupOnPhoto}
              onChange={(e) => setMakeupOnPhoto(e.target.checked)}
            />
            <span className="af-checklist__text">Estou maquiada nesta foto</span>
          </label>
          <label className="af-checklist__item">
            <input
              type="checkbox"
              className="af-native-checkbox"
              checked={dyedHair}
              onChange={(e) => setDyedHair(e.target.checked)}
            />
            <span className="af-checklist__text">
              O cabelo está tingido (não é a cor da raiz)
            </span>
          </label>
          <label className="af-checklist__item">
            <input
              type="checkbox"
              className="af-native-checkbox"
              checked={artificialLight}
              onChange={(e) => setArtificialLight(e.target.checked)}
            />
            <span className="af-checklist__text">
              A luz é artificial (lâmpada, não janela)
            </span>
          </label>
        </div>
      </AfSection>

      {/* 02 — Intenção */}
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

      {/* 03 — Áreas de foco */}
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

      {/* 04 — Contexto */}
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

      {/* LGPD */}
      <div className="af-consent">
        <label className="af-consent__row">
          <input
            type="checkbox"
            className="af-native-checkbox"
            checked={lgpd}
            onChange={(e) => setLgpd(e.target.checked)}
          />
          <div>
            <p className="af-consent__title">
              Consinto com o uso da minha foto para fins de análise de
              colorimetria pessoal.
            </p>
            <p className="af-consent__hint">
              Sua foto é usada exclusivamente para esta análise, com acesso
              restrito à consultora responsável. Em conformidade com a LGPD
              (Lei nº 13.709/2018). Você pode solicitar a exclusão a qualquer
              momento.
            </p>
          </div>
        </label>
      </div>

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
            Preencha todos os campos obrigatórios para continuar.
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
