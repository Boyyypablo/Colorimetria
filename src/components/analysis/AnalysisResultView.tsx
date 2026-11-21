"use client";

import { useState } from "react";
import { SimulationPanel } from "@/components/SimulationPanel";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { ConsultantReviewForm } from "@/components/ReviewActions";
import { ConsultantChatInvite } from "@/components/analysis/ConsultantChatInvite";
import { ConsultantReviewBanner } from "@/components/analysis/ConsultantReviewBanner";

export type RecItem = {
  hex: string;
  label: string;
  why?: string;
  garment?: string;
  garmentLabel?: string;
  photoUrl?: string;
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
    initialVotes: Array<{ target: string; kind: "HELPED" | "DID_NOT_HELP" }>;
  } | null;
  staffTech: {
    context: string;
    contrastScore: number | null;
    contrastSource: string | null;
    detectorProvider: string | null;
    qualityBand: string | null;
  } | null;
  staffReview: {
    seasons: Array<{ id: string; namePt: string }>;
    currentSeasonId: string | null;
  } | null;
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

function guidanceTone(title: string): "default" | "soft" | "avoid" {
  if (/^evitar$/i.test(title) || /fora da paleta/i.test(title)) return "avoid";
  if (/^suavizar/i.test(title)) return "soft";
  return "default";
}

export function AnalysisResultView(props: AnalysisResultViewProps) {
  const firstAnchor = props.navItems[0]?.href.replace("#", "") ?? "";
  const [activeAnchor, setActiveAnchor] = useState(firstAnchor);

  function scrollTo(id: string) {
    setActiveAnchor(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const paletteUse =
    props.rankedUse.length > 0
      ? props.rankedUse
      : props.useColors.map((hex) => ({ hex, why: "" }));

  const showClientPhotoTips =
    !props.isStaff && props.qualityFailedTips.length > 0;
  const showStaffQuality =
    props.isStaff &&
    (props.qualityWarnings.length > 0 ||
      props.qualityFailedTips.length > 0 ||
      (props.evaluation?.reviewReasons.length ?? 0) > 0);

  return (
    <div className="ar-stage">
      <div className="ar-stage__wash" aria-hidden />
      {props.navItems.length > 0 && (
        <nav className="ar-nav" aria-label="Seções da leitura">
          <div className="ar-nav__track">
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
          </div>
        </nav>
      )}
      <div className="ar-shell">
        <div className="ar-shell__rail ar-shell__rail--left" aria-hidden />
        <div className="ar-shell__inner">

          <section className="ar-hero">
            <div className="ar-hero__layout">
              <aside className="ar-hero__media">
                <div className="ar-hero__photo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={props.photoUrl}
                    alt="Foto enviada para a leitura"
                    className="ar-hero__photo"
                  />
                </div>
                {(props.undertoneLabel || props.confidencePercent != null) && (
                  <div className="ar-hero__media-meta">
                    {props.undertoneLabel ? (
                      <p className="ar-hero__media-meta-row">
                        <span>Subtom</span>
                        <strong>{props.undertoneLabel}</strong>
                      </p>
                    ) : null}
                    {props.confidencePercent != null ? (
                      <p className="ar-hero__media-meta-row">
                        <span>Certeza</span>
                        <strong>
                          {props.confidencePercent}%
                          {props.confidenceBand ? ` · ${props.confidenceBand}` : ""}
                        </strong>
                      </p>
                    ) : null}
                  </div>
                )}
              </aside>

              <div className="ar-hero__copy">
                <div className="ar-hero__intro">
                  <p className="ar-hero__eyebrow">Sua estação de cor</p>
                  <h1 className="ar-hero__season">
                    {props.seasonName || "Em processamento"}
                  </h1>
                </div>

                {props.statusKey === "NEEDS_REVIEW" && (
                  <p className="ar-hero__provisional">
                    Leitura provisória — pedimos uma selfie com melhor luz ou a
                    revisão de uma consultora para fechar a cartela.
                  </p>
                )}

                {props.confidenceNote ? (
                  <p className="ar-hero__meta-note">{props.confidenceNote}</p>
                ) : null}

                {props.seasonDescription && (
                  <p className="ar-hero__desc">{props.seasonDescription}</p>
                )}
                {props.undertoneHint && (
                  <p className="ar-hero__desc">{props.undertoneHint}</p>
                )}
                {props.sisterNote && (
                  <p className="ar-hero__desc">{props.sisterNote}</p>
                )}

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
                    {props.isStaff &&
                      props.evaluation.checks &&
                      props.evaluation.checks.length > 0 && (
                        <ul className="ar-why__checks">
                          {props.evaluation.checks.map((check) => (
                            <li
                              key={check.id}
                              className={
                                check.pass
                                  ? "ar-why__check"
                                  : "ar-why__check ar-why__check--fail"
                              }
                            >
                              <span className="ar-why__check-label">
                                {check.label}
                              </span>
                              <span className="ar-why__check-note">{check.note}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                )}

                {!props.isStaff && props.lowConfidenceWarning && (
                  <p className="ar-hero__desc ar-hero__desc--warn">
                    Estimativa com baixa certeza — uma consultora pode revisar.
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
              </div>
            </div>
          </section>

          <div className="ar-body">
            {showClientPhotoTips && (
              <div className="ar-quality">
                <div className="ar-quality__tips">
                  <p className="ar-quality__tips-title">Para a próxima foto</p>
                  <ul>
                    {props.qualityFailedTips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {showStaffQuality && (
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
                    {props.consultantNote.author
                      ? ` · ${props.consultantNote.author}`
                      : ""}
                  </p>
                  <p className="ar-note__date">{props.consultantNote.date}</p>
                </div>
                <p className="ar-note__text">
                  &ldquo;{props.consultantNote.text}&rdquo;
                </p>
              </div>
            )}

            {paletteUse.length > 0 && (
              <section id="paleta" className="ar-section">
                <div className="ar-section__head">
                  <h2 className="ar-section__title">Paleta de cores</h2>
                  <span className="ar-section__label">Sua cartela</span>
                </div>

                <div className="ar-palette">
                  <p className="ar-subhead">Cores para usar</p>
                  <div className="ar-palette-strip" role="list">
                    {paletteUse.map((c, i) => (
                      <article
                        key={c.hex}
                        className="ar-palette-swatch"
                        role="listitem"
                        style={{ ["--swatch" as string]: c.hex }}
                      >
                        <div className="ar-palette-swatch__chip" aria-hidden>
                          <span className="ar-palette-swatch__rank">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="ar-palette-swatch__meta">
                          <p className="ar-palette-swatch__hex">{c.hex}</p>
                          {c.why ? (
                            <p className="ar-palette-swatch__why">{c.why}</p>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>

                  {props.avoidColors.length > 0 && (
                    <div className="ar-palette-avoid">
                      <p className="ar-subhead">Cores para evitar</p>
                      <div className="ar-palette-avoid__row" role="list">
                        {props.avoidColors.map((hex) => (
                          <div
                            key={hex}
                            className="ar-palette-avoid__item"
                            role="listitem"
                          >
                            <span
                              className="ar-palette-avoid__chip"
                              style={{ background: hex }}
                              aria-hidden
                            />
                            <div>
                              <p className="ar-palette-avoid__hex">{hex}</p>
                              <p className="ar-palette-avoid__hint">
                                Longe do rosto
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {props.coachingBlocks.length > 0 && (
              <section id="orientacoes" className="ar-section">
                <div className="ar-section__head">
                  <h2 className="ar-section__title">Orientações</h2>
                  <span className="ar-section__label">Guia prático</span>
                </div>
                <div className="ar-topics">
                  {props.coachingBlocks.map((block) => {
                    const tone = guidanceTone(block.title);
                    return (
                      <article
                        key={block.title}
                        className={`ar-topic ar-topic--${tone}`}
                      >
                        <header className="ar-topic__head">
                          <h3 className="ar-topic__title">{block.title}</h3>
                          <span className="ar-topic__count">
                            {block.tips.length}{" "}
                            {block.tips.length === 1 ? "dica" : "dicas"}
                          </span>
                        </header>
                        <ol className="ar-topic__list">
                          {block.tips.map((tip, idx) => (
                            <li key={tip} className="ar-topic__item">
                              <span className="ar-topic__n" aria-hidden>
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <p className="ar-topic__text">{tip}</p>
                            </li>
                          ))}
                        </ol>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {props.skinCorrection && (
              <section id="cuidados" className="ar-section">
                <div className="ar-section__head">
                  <h2 className="ar-section__title">Cuidados com a pele</h2>
                  <span className="ar-section__label">Recomendações</span>
                </div>
                <p className="ar-care-intro">{props.skinCorrection.intro}</p>
                <div className="ar-care-list">
                  {props.skinCorrection.items.map((item, i) => (
                    <div key={`${item.hex}-${i}`} className="ar-care-item">
                      <div
                        className="ar-care-item__dot"
                        style={{ background: item.hex }}
                      />
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
                  <p className="ar-care-note">{props.ethicalNote}</p>
                )}
              </section>
            )}

            {props.isOwner && props.feedback && (
              <section
                id="feedback"
                className="ar-section"
                aria-labelledby="feedback-heading"
              >
                <div className="ar-section__head">
                  <h2 id="feedback-heading" className="ar-section__title">
                    Sua opinião
                  </h2>
                  <span className="ar-section__label">
                    Calibra as próximas leituras
                  </span>
                </div>
                <FeedbackPanel
                  analysisId={props.analysisId}
                  seasonName={props.feedback.seasonName}
                  clothing={props.feedback.clothing}
                  lipstick={props.feedback.lipstick}
                  eyeshadow={props.feedback.eyeshadow}
                  base={props.feedback.base}
                  corrections={props.feedback.corrections}
                  initialVotes={props.feedback.initialVotes}
                />
              </section>
            )}

            {props.isOwner &&
              props.simulation &&
              props.simulation.colors.length > 0 && (
                <section id="simulacao" className="ar-section">
                  <div className="ar-section__head">
                    <h2 className="ar-section__title">Simulação visual</h2>
                    <span className="ar-section__label">
                      Experimente na sua foto
                    </span>
                  </div>
                  <SimulationPanel
                    analysisId={props.analysisId}
                    colors={props.simulation.colors}
                    vtoProvider={props.simulation.vtoProvider}
                    aiReady={props.simulation.aiReady}
                  />
                </section>
              )}

            {props.isOwner ? (
              <>
                <ConsultantReviewBanner
                  analysisId={props.analysisId}
                  seasonName={props.seasonName}
                  canRequestReview={props.canRequestReview}
                  alreadyInReview={props.statusKey === "NEEDS_REVIEW"}
                  hasConsultantNote={Boolean(props.consultantNote)}
                />
                <ConsultantChatInvite
                  analysisId={props.analysisId}
                  consultantName={props.consultantNote?.author}
                  seasonName={props.seasonName}
                />
              </>
            ) : null}
          </div>

          {props.isStaff && (props.staffTech || props.staffReview) && (
            <div className="ar-body ar-staff-panel">
              {props.staffTech && (
                <div className="ar-staff-note">
                  Contexto: {props.staffTech.context}
                  {props.staffTech.contrastScore != null
                    ? ` · Contraste ${props.staffTech.contrastScore.toFixed(0)}`
                    : ""}
                  {props.staffTech.contrastSource
                    ? ` (${props.staffTech.contrastSource})`
                    : ""}
                  {props.staffTech.detectorProvider
                    ? ` · Face ${props.staffTech.detectorProvider}`
                    : ""}
                  {props.staffTech.qualityBand
                    ? ` · Qualidade ${qualityBandLabel[props.staffTech.qualityBand] || props.staffTech.qualityBand}`
                    : ""}
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
        </div>
        <div className="ar-shell__rail ar-shell__rail--right" aria-hidden />
      </div>
    </div>
  );
}
