"use client";

import { useState } from "react";
import { SimulationPanel } from "@/components/SimulationPanel";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { ConsultantReviewForm, RequestReviewButton } from "@/components/ReviewActions";
import { GarmentPreview } from "@/components/analysis/GarmentPreview";
import type { GarmentKind } from "../../../data/wardrobe/garments";

export type RecItem = {
  hex: string;
  label: string;
  why?: string;
  garment?: GarmentKind;
  garmentLabel?: string;
  photoUrl?: string;
};

export type PlanPriority = {
  trait: string;
  action: "suavizar" | "exaltar" | "manter";
  why: string;
};

export type PlanChange = {
  id: string;
  area: string;
  suggestion: string;
  colors: string[];
  do: string;
  dont: string;
};

export type AnalysisResultViewProps = {
  analysisId: string;
  photoUrl: string;
  statusKey: "PENDING" | "READY" | "NEEDS_REVIEW" | "APPROVED";
  seasonName: string | null;
  seasonDescription: string | null;
  undertoneLabel: string | null;
  undertoneHint: string | null;
  sisterNote: string | null;
  evaluation: {
    why: string;
    axes: Array<{
      id: string;
      label: string;
      value: string;
      hint?: string;
      uncertain?: boolean;
    }>;
    checks: Array<{ id: string; label: string; pass: boolean; note: string }>;
    reviewReasons: string[];
    needsReview?: boolean;
  } | null;
  confidencePercent: number | null;
  confidenceBand: "baixa" | "moderada" | "alta" | null;
  confidenceNote: string | null;
  lowConfidenceWarning: boolean;
  intention: string | null;
  goalLabels: string[];
  contextLabel: string | null;
  consultantNote: { author: string | null; date: string; text: string } | null;
  planStatusNote: string | null;
  plan: {
    assessment: string;
    seasonAlignment: string;
    needsHumanReview: boolean;
    priorities: PlanPriority[];
    changes: PlanChange[];
  } | null;
  useColors: string[];
  rankedUse: Array<{ hex: string; why: string }>;
  avoidColors: string[];
  coachingBlocks: Array<{ title: string; tips: string[] }>;
  skinCorrection: {
    intro: string;
    items: Array<{ hex: string; label: string; role: string; why: string }>;
  } | null;
  ethicalNote: string | null;
  lookGroups: Array<{ title: string; items: RecItem[] }>;
  navItems: Array<{ href: string; label: string }>;
  isOwner: boolean;
  isStaff: boolean;
  qualityWarnings: string[];
  qualityFailedTips: string[];
  canRequestReview: boolean;
  simulation: {
    colors: string[];
    vtoProvider: "mock" | "fal" | "gemini" | "huggingface";
    aiReady: boolean;
  } | null;
  feedback: {
    seasonName: string;
    clothing: RecItem[];
    lipstick: RecItem[];
    eyeshadow: RecItem[];
    base: RecItem[];
    corrections: Array<{ hex: string; label: string; target: string }>;
    aiChanges: Array<{ id: string; label: string; target: string; hex?: string }>;
    initialVotes: Array<{ target: string; kind: "HELPED" | "DID_NOT_HELP" }>;
  } | null;
  staffTech: {
    context: string;
    contrastScore: number | null;
    contrastSource: string | null;
    detectorProvider: string | null;
    qualityBand: string | null;
    consultantStatus: string | null;
    usedVision: boolean;
    consultantError: string | null;
  } | null;
  staffReview: {
    seasons: Array<{ id: string; namePt: string }>;
    currentSeasonId: string | null;
  } | null;
};

const ACTION_LABEL: Record<PlanPriority["action"], string> = {
  suavizar: "Suavizar",
  exaltar: "Exaltar",
  manter: "Manter",
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Corretivo",
  base: "Base",
  iluminador: "Iluminador",
  evitar_local: "Evitar no teste de cores",
  foco_olhar: "Foco no olhar",
};

const qualityBandLabel: Record<string, string> = {
  boa: "boa",
  aceitavel: "aceitável",
  ruim: "ruim",
};

function guidanceCardClass(title: string): string {
  if (/^evitar$/i.test(title) || /^suavizar/i.test(title)) {
    return "ar-guidance-card ar-guidance-card--avoid";
  }
  if (/fora da paleta/i.test(title)) {
    return "ar-guidance-card ar-guidance-card--off";
  }
  return "ar-guidance-card";
}

export function AnalysisResultView(props: AnalysisResultViewProps) {
  const firstAnchor = props.navItems[0]?.href.replace("#", "") ?? "";
  const [activeAnchor, setActiveAnchor] = useState(firstAnchor);

  function scrollTo(id: string) {
    setActiveAnchor(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {props.navItems.length > 0 && (
        <nav className="ar-nav" aria-label="Seções do resultado">
          {props.navItems.map((item) => {
            const id = item.href.replace("#", "");
            const isFeedback = id === "feedback";
            return (
              <button
                key={item.href}
                type="button"
                className={`ar-nav__link${activeAnchor === id ? " ar-nav__link--active" : ""}${isFeedback ? " ar-nav__link--cta" : ""}`}
                onClick={() => scrollTo(id)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}

      <section className="ar-hero">
        <div className="ar-hero__copy">
          <div className="ar-hero__top">
            <div className="ar-hero__photo-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={props.photoUrl}
                alt="Foto enviada para análise"
                className="ar-hero__photo"
              />
            </div>
            <div className="ar-hero__intro">
              <p className="ar-hero__eyebrow">Sua estação de cor</p>
              <h1 className="ar-hero__season">
                {props.seasonName || "Em processamento"}
              </h1>
            </div>
          </div>

          {props.statusKey === "NEEDS_REVIEW" && (
            <p className="ar-hero__provisional">
              Leitura provisória — a evidência da foto não basta para fechar a
              cartela. Refaça a selfie ou peça revisão.
            </p>
          )}
          {(props.undertoneLabel || props.confidencePercent != null) && (
            <div className="ar-hero__meta">
              {props.undertoneLabel && (
                <>
                  <span className="ar-hero__meta-label">Subtom</span>
                  <span className="ar-hero__meta-pill">{props.undertoneLabel}</span>
                </>
              )}
              {props.confidencePercent != null && (
                <span className="ar-hero__meta-note">
                  Certeza da medição: {props.confidencePercent}%
                  {props.confidenceBand ? ` · ${props.confidenceBand}` : ""}
                  {props.confidenceNote ? ` — ${props.confidenceNote}` : ""}
                </span>
              )}
            </div>
          )}

          {props.seasonDescription && <p className="ar-hero__desc">{props.seasonDescription}</p>}
          {props.undertoneHint && <p className="ar-hero__desc">{props.undertoneHint}</p>}
          {props.sisterNote && <p className="ar-hero__desc">{props.sisterNote}</p>}
          {props.evaluation && (
            <div id="leitura" className="ar-why">
              <p className="ar-why__label">Por que esta cartela</p>
              <p className="ar-why__text">{props.evaluation.why}</p>
              <ul className="ar-why__axes">
                {props.evaluation.axes.map((axis) => (
                  <li
                    key={axis.id}
                    className={`ar-why__axis${axis.uncertain ? " ar-why__axis--uncertain" : ""}`}
                  >
                    <span className="ar-why__axis-label">{axis.label}</span>
                    <span className="ar-why__axis-value">{axis.value}</span>
                    {axis.hint ? (
                      <span className="ar-why__axis-hint">{axis.hint}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {props.evaluation.checks && props.evaluation.checks.length > 0 && (
                <ul className="ar-why__checks">
                  {props.evaluation.checks.map((check) => (
                    <li
                      key={check.id}
                      className={
                        check.pass ? "ar-why__check" : "ar-why__check ar-why__check--fail"
                      }
                    >
                      <span className="ar-why__check-label">{check.label}</span>
                      <span className="ar-why__check-note">{check.note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!props.isStaff && props.lowConfidenceWarning && (
            <p className="ar-hero__desc" style={{ color: "var(--lp-terracotta)" }}>
              Estimativa com baixa certeza — uma consultora pode revisar.
            </p>
          )}
          {props.planStatusNote && (
            <p className="ar-hero__desc" style={{ color: "var(--lp-terracotta)" }}>
              {props.planStatusNote}
            </p>
          )}

          {(props.intention || props.contextLabel) && (
            <dl className="ar-hero__facts">
              {props.intention && (
                <div className="ar-hero__fact">
                  <dt>Intenção</dt>
                  <dd>&ldquo;{props.intention}&rdquo;</dd>
                </div>
              )}
              {props.contextLabel && (
                <div className="ar-hero__fact">
                  <dt>Contexto</dt>
                  <dd>{props.contextLabel}</dd>
                </div>
              )}
            </dl>
          )}

          {props.goalLabels.length > 0 && (
            <div className="ar-hero__areas">
              <p className="ar-hero__areas-label">Áreas analisadas</p>
              <div className="ar-hero__areas-list">
                {props.goalLabels.map((g) => (
                  <span key={g} className="ar-hero__area-chip">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {props.canRequestReview && (
            <div style={{ marginTop: "1.5rem" }}>
              <RequestReviewButton analysisId={props.analysisId} />
            </div>
          )}
        </div>
      </section>

      <div className="ar-body">
        {(props.qualityWarnings.length > 0 ||
          props.qualityFailedTips.length > 0 ||
          (props.evaluation?.reviewReasons.length ?? 0) > 0) && (
          <div className="ar-quality">
            {props.evaluation && props.evaluation.reviewReasons.length > 0 && (
              <ul className="ar-quality__warnings">
                {props.evaluation.reviewReasons.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            {props.qualityWarnings.length > 0 && (
              <ul className="ar-quality__warnings">
                {props.qualityWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            {props.qualityFailedTips.length > 0 && (
              <div className="ar-quality__tips">
                <p className="ar-quality__tips-title">Para a próxima foto</p>
                <ul>
                  {props.qualityFailedTips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {props.consultantNote && (
          <div className="ar-note">
            <div className="ar-note__head">
              <p className="ar-note__author">
                Nota da consultora
                {props.consultantNote.author ? ` · ${props.consultantNote.author}` : ""}
              </p>
              <p className="ar-note__date">{props.consultantNote.date}</p>
            </div>
            <p className="ar-note__text">&ldquo;{props.consultantNote.text}&rdquo;</p>
          </div>
        )}

        {props.plan && (
          <section id="plano" className="ar-section">
            <div className="ar-section__head">
              <h2 className="ar-section__title">Plano personalizado</h2>
              <span className="ar-section__label">Estratégia</span>
            </div>

            <p className="ar-quote">&ldquo;{props.plan.assessment}&rdquo;</p>

            {props.plan.needsHumanReview && (
              <p className="ar-plan-note">
                Esta análise pediu revisão humana — uma consultora pode refinar o plano.
              </p>
            )}

            {props.plan.priorities.length > 0 && (
              <>
                <p className="ar-subhead">Prioridades</p>
                <div className="ar-priority-list">
                  {props.plan.priorities.map((p, i) => (
                    <div key={`${p.trait}-${i}`} className="ar-priority">
                      <span className={`ar-priority__badge ar-priority__badge--${p.action}`}>
                        {ACTION_LABEL[p.action]}
                      </span>
                      <div>
                        <p className="ar-priority__trait">{p.trait}</p>
                        <p className="ar-priority__why">{p.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {props.plan.changes.length > 0 && (
              <>
                <p className="ar-subhead">Mudanças sugeridas</p>
                <div className="ar-change-list">
                  {props.plan.changes.map((c) => (
                    <div key={c.id} className="ar-change">
                      <div className="ar-change__head">
                        <div>
                          <p className="ar-change__area">{c.area}</p>
                          <p className="ar-change__suggestion">{c.suggestion}</p>
                        </div>
                        {c.colors.length > 0 && (
                          <div className="ar-change__colors">
                            {c.colors.map((hex) => (
                              <div
                                key={hex}
                                className="ar-change__color"
                                style={{ background: hex }}
                                title={hex}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ar-change__grid">
                        <div className="ar-change__do">
                          <p className="ar-change__do-label">Faça</p>
                          <p className="ar-change__do-text">{c.do}</p>
                        </div>
                        <div className="ar-change__dont">
                          <p className="ar-change__dont-label">Evite</p>
                          <p className="ar-change__dont-text">{c.dont}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {props.plan.seasonAlignment && (
              <div className="ar-alignment">
                <p className="ar-alignment__label">Alinhamento com a estação</p>
                <p className="ar-alignment__text">{props.plan.seasonAlignment}</p>
              </div>
            )}
          </section>
        )}

        {props.useColors.length > 0 && (
          <section id="paleta" className="ar-section">
            <div className="ar-section__head">
              <h2 className="ar-section__title">Paleta de cores</h2>
              <span className="ar-section__label">Sua cartela</span>
            </div>

            <p className="ar-subhead">Cores para usar</p>
            <div className="ar-palette-use">
              {(props.rankedUse.length > 0
                ? props.rankedUse
                : props.useColors.map((hex) => ({ hex, why: "" }))
              ).map((c, i) => (
                <div key={c.hex} className="ar-swatch-card">
                  <div className="ar-swatch-card__color" style={{ background: c.hex }}>
                    <span className="ar-swatch-card__rank">#{i + 1}</span>
                  </div>
                  <p className="ar-swatch-card__hex">{c.hex}</p>
                  {c.why ? (
                    <p className="ar-swatch-card__why">{c.why}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {props.avoidColors.length > 0 && (
              <div className="ar-palette-avoid">
                <p className="ar-subhead">Cores para evitar</p>
                <div className="ar-palette-avoid__grid">
                  {props.avoidColors.map((hex) => (
                    <div key={hex} className="ar-avoid-chip">
                      <div
                        className="ar-avoid-chip__dot"
                        style={{ background: hex }}
                        aria-hidden
                      >
                        <span className="ar-avoid-chip__x">✕</span>
                      </div>
                      <div>
                        <p className="ar-avoid-chip__name">{hex}</p>
                        <p className="ar-avoid-chip__why">Evitar perto do rosto</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {props.coachingBlocks.length > 0 && (
          <section id="orientacoes" className="ar-section">
            <div className="ar-section__head">
              <h2 className="ar-section__title">Orientações</h2>
              <span className="ar-section__label">Guia prático</span>
            </div>
            <div className="ar-guidance-grid">
              {props.coachingBlocks.map((block) => (
                <div key={block.title} className={guidanceCardClass(block.title)}>
                  <p className="ar-guidance-card__label">{block.title}</p>
                  <ul>
                    {block.tips.map((t) => (
                      <li key={t} className="ar-guidance-card__text">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {props.lookGroups.length > 0 && (
          <section id="looks" className="ar-section">
            <div className="ar-section__head">
              <h2 className="ar-section__title">Looks sugeridos</h2>
              <span className="ar-section__label">Por categoria</span>
            </div>
            <div className="ar-looks-grid">
              {props.lookGroups.map((group) => {
                const isWardrobe = group.items.some((item) => item.garment);
                return (
                  <div
                    key={group.title}
                    className={`ar-look-card${isWardrobe ? " ar-look-card--wardrobe" : ""}`}
                  >
                    <div className="ar-look-card__head">
                      <p className="ar-look-card__title">{group.title}</p>
                    </div>
                    {isWardrobe ? (
                      <div className="ar-garment-grid">
                        {group.items.map((item) => (
                          <div
                            key={`${item.garment}-${item.label}-${item.hex}`}
                            className="ar-garment-card"
                          >
                            {item.garment ? (
                              <GarmentPreview
                                kind={item.garment}
                                hex={item.hex}
                                label={item.garmentLabel || item.label}
                                photoUrl={item.photoUrl}
                              />
                            ) : null}
                            <p className="ar-garment-card__kind">
                              {item.garmentLabel || "Peça"}
                            </p>
                            <p className="ar-garment-card__name">{item.label}</p>
                            <p className="ar-garment-card__hex">{item.hex}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ar-look-card__body">
                        {group.items.map((item) => (
                          <div
                            key={`${item.label}-${item.hex}`}
                            className="ar-look-card__row"
                          >
                            <div
                              className="ar-look-card__dot"
                              style={{ background: item.hex }}
                            />
                            <div>
                              <div className="ar-look-card__row-head">
                                <span className="ar-look-card__row-value">
                                  {item.label}
                                </span>
                                <span className="ar-look-card__row-hex">{item.hex}</span>
                              </div>
                              {item.why && (
                                <p className="ar-look-card__row-why">{item.why}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {props.skinCorrection && (
          <section id="cuidados" className="ar-section">
            <div className="ar-section__head">
              <h2 className="ar-section__title">Cuidados com a pele</h2>
              <span className="ar-section__label">Recomendações específicas</span>
            </div>
            <p className="ar-guidance-card__text ar-care-intro">
              {props.skinCorrection.intro}
            </p>
            <div className="ar-care-list">
              {props.skinCorrection.items.map((item, i) => (
                <div key={`${item.hex}-${i}`} className="ar-care-item">
                  <div className="ar-care-item__dot" style={{ background: item.hex }} />
                  <div>
                    <div className="ar-care-item__head">
                      <p className="ar-care-item__name">{item.label}</p>
                      <span className="ar-care-item__hex">{item.hex}</span>
                      <span className="ar-care-item__role">
                        {ROLE_LABEL[item.role] || item.role}
                      </span>
                    </div>
                    <p className="ar-care-item__why">{item.why}</p>
                  </div>
                </div>
              ))}
            </div>
            {props.ethicalNote && (
              <p className="ar-guidance-card__text ar-care-note">{props.ethicalNote}</p>
            )}
          </section>
        )}

        {props.isOwner && props.feedback && (
          <section id="feedback" className="ar-section" aria-labelledby="feedback-heading">
            <div className="ar-section__head">
              <h2 id="feedback-heading" className="ar-section__title">
                Sua opinião
              </h2>
              <span className="ar-section__label">Calibra as próximas análises</span>
            </div>
            <FeedbackPanel
              analysisId={props.analysisId}
              seasonName={props.feedback.seasonName}
              clothing={props.feedback.clothing}
              lipstick={props.feedback.lipstick}
              eyeshadow={props.feedback.eyeshadow}
              base={props.feedback.base}
              corrections={props.feedback.corrections}
              aiChanges={props.feedback.aiChanges}
              initialVotes={props.feedback.initialVotes}
            />
          </section>
        )}

        {props.isOwner && props.simulation && props.simulation.colors.length > 0 && (
          <section id="simulacao" className="ar-section">
            <div className="ar-section__head">
              <h2 className="ar-section__title">Simulação visual</h2>
              <span className="ar-section__label">Experimente na sua foto</span>
            </div>
            <SimulationPanel
              analysisId={props.analysisId}
              colors={props.simulation.colors}
              vtoProvider={props.simulation.vtoProvider}
              aiReady={props.simulation.aiReady}
            />
          </section>
        )}
      </div>

      {props.isStaff && (props.staffTech || props.staffReview) && (
        <div className="ar-body ar-staff-panel">
          {props.staffTech && (
            <div className="ar-staff-note">
              Contexto: {props.staffTech.context}
              {props.staffTech.contrastScore != null
                ? ` · Contraste ${props.staffTech.contrastScore.toFixed(0)}`
                : ""}
              {props.staffTech.contrastSource ? ` (${props.staffTech.contrastSource})` : ""}
              {props.staffTech.detectorProvider ? ` · Face ${props.staffTech.detectorProvider}` : ""}
              {props.staffTech.qualityBand
                ? ` · Qualidade ${qualityBandLabel[props.staffTech.qualityBand] || props.staffTech.qualityBand}`
                : ""}
              {props.staffTech.consultantStatus
                ? ` · Consultora ${props.staffTech.consultantStatus}${props.staffTech.usedVision ? "+foto" : ""}`
                : ""}
              {props.staffTech.consultantError && (
                <span className="ar-staff-note__error"> {props.staffTech.consultantError}</span>
              )}
            </div>
          )}

          {props.staffReview && props.statusKey !== "APPROVED" && (
            <ConsultantReviewForm
              analysisId={props.analysisId}
              seasons={props.staffReview.seasons}
              currentSeasonId={props.staffReview.currentSeasonId}
            />
          )}
        </div>
      )}
    </>
  );
}
