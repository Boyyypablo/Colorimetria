"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Compass,
  Droplets,
  Eye,
  Heart,
  MessageCircleHeart,
  Palette,
  Scissors,
  Shirt,
  Sparkles,
  Wand2,
} from "lucide-react";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { ConsultantReviewForm } from "@/components/ReviewActions";
import { ConsultantChatInvite } from "@/components/analysis/ConsultantChatInvite";
import { ConsultantReviewBanner } from "@/components/analysis/ConsultantReviewBanner";
import { PaletteStudio } from "@/components/analysis/PaletteStudio";

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
  navItems: Array<{ href: string; label: string }>;
  isOwner: boolean;
  isStaff: boolean;
  qualityWarnings: string[];
  qualityFailedTips: string[];
  canRequestReview: boolean;
  paymentsEnabled: boolean;
  reviewPriceLabel: string;
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

const TAB_META: Record<
  string,
  { subtitle: string; icon: (active: boolean) => ReactNode }
> = {
  leitura: {
    subtitle: "Sua estação",
    icon: () => <Sparkles size={16} aria-hidden />,
  },
  paleta: {
    subtitle: "Espelho & cores",
    icon: () => <Palette size={16} aria-hidden />,
  },
  orientacoes: {
    subtitle: "Guia prático",
    icon: () => <Compass size={16} aria-hidden />,
  },
  cuidados: {
    subtitle: "Sua pele",
    icon: () => <Droplets size={16} aria-hidden />,
  },
  feedback: {
    subtitle: "Calibrar",
    icon: () => <Heart size={16} aria-hidden />,
  },
  consultora: {
    subtitle: "Atendimento",
    icon: () => <MessageCircleHeart size={16} aria-hidden />,
  },
};

function guidanceTone(title: string): "default" | "soft" | "avoid" {
  if (/^evitar$/i.test(title) || /fora da paleta/i.test(title)) return "avoid";
  if (/^suavizar/i.test(title)) return "soft";
  return "default";
}

function guidanceIcon(title: string): ReactNode {
  if (/roupa|estilo/i.test(title)) return <Shirt size={16} aria-hidden />;
  if (/maquiagem/i.test(title)) return <Sparkles size={16} aria-hidden />;
  if (/cabelo|fio/i.test(title)) return <Scissors size={16} aria-hidden />;
  if (/suavizar/i.test(title)) return <Eye size={16} aria-hidden />;
  if (/evitar/i.test(title)) return <Ban size={16} aria-hidden />;
  return <Wand2 size={16} aria-hidden />;
}

export function AnalysisResultView(props: AnalysisResultViewProps) {
  const tabs = props.navItems.map((item) => ({
    id: item.href.replace("#", ""),
    label: item.label,
  }));
  const firstTab = tabs[0]?.id ?? "leitura";
  const [activeTab, setActiveTab] = useState(firstTab);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [topicFilter, setTopicFilter] = useState<string>("all");

  useEffect(() => {
    const validIds = new Set(
      props.navItems.map((item) => item.href.replace("#", "")),
    );
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && validIds.has(hash)) {
        setActiveTab(hash);
      }
    };
    const raf = window.requestAnimationFrame(applyHash);
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", applyHash);
    };
  }, [props.navItems]);

  function openTab(id: string) {
    const prevIdx = tabs.findIndex((t) => t.id === activeTab);
    const nextIdx = tabs.findIndex((t) => t.id === id);
    if (prevIdx !== -1 && nextIdx !== -1 && nextIdx !== prevIdx) {
      setDirection(nextIdx > prevIdx ? 1 : -1);
    }
    setActiveTab(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const currentIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeTab),
  );
  const prevTab = currentIndex > 0 ? tabs[currentIndex - 1] : null;
  const nextTab =
    currentIndex < tabs.length - 1 ? tabs[currentIndex + 1] : null;
  const progressPercent =
    tabs.length > 0 ? ((currentIndex + 1) / tabs.length) * 100 : 100;

  const paletteUse =
    props.rankedUse.length > 0
      ? props.rankedUse
      : props.useColors.map((hex) => ({ hex, why: "" }));

  const previewSwatches = paletteUse.slice(0, 3).map((c) => c.hex);

  const visibleCoachingBlocks =
    topicFilter === "all"
      ? props.coachingBlocks
      : props.coachingBlocks.filter((b) => b.title === topicFilter);

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

      {tabs.length > 0 && (
        <nav className="ar-dock-bar" aria-label="Capítulos da sua análise">
          <div className="ar-dock-wrap">
            <div className="ar-dock" role="tablist">
              {tabs.map((tab, idx) => {
                const isActive = activeTab === tab.id;
                const meta = TAB_META[tab.id];
                return (
                  <motion.button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    whileTap={{ scale: 0.97 }}
                    className={`ar-dock__tab${isActive ? " ar-dock__tab--active" : ""}`}
                    onClick={() => openTab(tab.id)}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="ar-dock-pill"
                        className="ar-dock__pill"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 32,
                        }}
                        aria-hidden
                      />
                    )}
                    <span className="ar-dock__content">
                      <span className="ar-dock__icon">
                        {meta ? meta.icon(isActive) : <Sparkles size={16} />}
                      </span>
                      <span className="ar-dock__labels">
                        <span className="ar-dock__title">
                          {tab.label}
                          {tab.id === "paleta" && previewSwatches.length > 0 ? (
                            <span className="ar-dock__dots" aria-hidden>
                              {previewSwatches.map((hex) => (
                                <span
                                  key={hex}
                                  className="ar-dock__dot"
                                  style={{ background: hex }}
                                />
                              ))}
                            </span>
                          ) : null}
                        </span>
                        <span className="ar-dock__sub">
                          {meta?.subtitle || `Passo 0${idx + 1}`}
                        </span>
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="ar-dock-progress" aria-hidden>
              <motion.div
                className="ar-dock-progress__bar"
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
              />
            </div>
          </div>
        </nav>
      )}

      <div className="ar-shell">
        <div className="ar-shell__rail ar-shell__rail--left" aria-hidden />
        <div className="ar-shell__inner">
          <div className="ar-window-meta">
            <span className="ar-window-meta__step">
              {String(currentIndex + 1).padStart(2, "0")} /{" "}
              {String(tabs.length || 1).padStart(2, "0")}
            </span>
            <span className="ar-window-meta__name">
              {tabs[currentIndex]?.label || "Leitura"}
              {props.seasonName ? ` · ${props.seasonName}` : ""}
            </span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "leitura" && (
              <motion.div
                key="leitura"
                id="panel-leitura"
                role="tabpanel"
                aria-labelledby="tab-leitura"
                className="ar-window"
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
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
                      {(props.undertoneLabel ||
                        props.confidencePercent != null) && (
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
                                {props.confidenceBand
                                  ? ` · ${props.confidenceBand}`
                                  : ""}
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
                          Leitura provisória — pedimos uma selfie com melhor luz
                          ou a revisão de uma consultora para fechar a cartela.
                        </p>
                      )}

                      {props.confidenceNote ? (
                        <p className="ar-hero__meta-note">
                          {props.confidenceNote}
                        </p>
                      ) : null}

                      {props.seasonDescription && (
                        <p className="ar-hero__desc">
                          {props.seasonDescription}
                        </p>
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
                                <span className="ar-why__axis-label">
                                  {axis.label}
                                </span>
                                <span className="ar-why__axis-value">
                                  {axis.value}
                                </span>
                                {axis.hint ? (
                                  <span className="ar-why__axis-hint">
                                    {axis.hint}
                                  </span>
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
                                    <span className="ar-why__check-note">
                                      {check.note}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>
                      )}

                      {!props.isStaff && props.lowConfidenceWarning && (
                        <p className="ar-hero__desc ar-hero__desc--warn">
                          Estimativa com baixa certeza — uma consultora pode
                          revisar.
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
                          <p className="ar-hero__areas-label">
                            Áreas analisadas
                          </p>
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

                {(showClientPhotoTips ||
                  showStaffQuality ||
                  props.consultantNote) && (
                  <div className="ar-body">
                    {showClientPhotoTips && (
                      <div className="ar-quality">
                        <div className="ar-quality__tips">
                          <p className="ar-quality__tips-title">
                            Para a próxima foto
                          </p>
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
                        {props.evaluation &&
                          props.evaluation.reviewReasons.length > 0 && (
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
                            <p className="ar-quality__tips-title">
                              Para a próxima foto
                            </p>
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
                          <p className="ar-note__date">
                            {props.consultantNote.date}
                          </p>
                        </div>
                        <p className="ar-note__text">
                          &ldquo;{props.consultantNote.text}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "paleta" && paletteUse.length > 0 && (
              <motion.div
                key="paleta"
                id="panel-paleta"
                role="tabpanel"
                aria-labelledby="tab-paleta"
                className="ar-window ar-body"
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <section id="paleta" className="ar-section">
                  <div className="ar-section__head">
                    <h2 className="ar-section__title">Paleta de cores</h2>
                    <span className="ar-section__label">
                      Estúdio interativo
                    </span>
                  </div>
                  <PaletteStudio
                    photoUrl={props.photoUrl}
                    seasonName={props.seasonName}
                    useColors={paletteUse}
                    avoidColors={props.avoidColors}
                  />
                </section>
              </motion.div>
            )}

            {activeTab === "orientacoes" && props.coachingBlocks.length > 0 && (
              <motion.div
                key="orientacoes"
                id="panel-orientacoes"
                role="tabpanel"
                aria-labelledby="tab-orientacoes"
                className="ar-window ar-body"
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <section id="orientacoes" className="ar-section">
                  <div className="ar-section__head">
                    <h2 className="ar-section__title">Orientações</h2>
                    <span className="ar-section__label">Guia prático</span>
                  </div>

                  {props.coachingBlocks.length > 1 && (
                    <div
                      className="ar-topic-filters"
                      role="group"
                      aria-label="Filtrar tema das orientações"
                    >
                      <button
                        type="button"
                        className={`ar-topic-filter${topicFilter === "all" ? " ar-topic-filter--on" : ""}`}
                        onClick={() => setTopicFilter("all")}
                      >
                        Todas ({props.coachingBlocks.length})
                      </button>
                      {props.coachingBlocks.map((block) => (
                        <button
                          key={block.title}
                          type="button"
                          className={`ar-topic-filter${topicFilter === block.title ? " ar-topic-filter--on" : ""}`}
                          onClick={() => setTopicFilter(block.title)}
                        >
                          {guidanceIcon(block.title)}
                          <span>{block.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="ar-topics-grid">
                    {visibleCoachingBlocks.map((block) => {
                      const tone = guidanceTone(block.title);
                      return (
                        <article
                          key={block.title}
                          className={`ar-topic ar-topic--card ar-topic--${tone}`}
                        >
                          <header className="ar-topic__head">
                            <div className="ar-topic__title-wrap">
                              <span className="ar-topic__icon">
                                {guidanceIcon(block.title)}
                              </span>
                              <h3 className="ar-topic__title">{block.title}</h3>
                            </div>
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
              </motion.div>
            )}

            {activeTab === "cuidados" && props.skinCorrection && (
              <motion.div
                key="cuidados"
                id="panel-cuidados"
                role="tabpanel"
                aria-labelledby="tab-cuidados"
                className="ar-window ar-body"
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
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
                            <span className="ar-care-item__hex">
                              {item.hex}
                            </span>
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
              </motion.div>
            )}

            {activeTab === "feedback" && props.isOwner && props.feedback && (
              <motion.div
                key="feedback"
                id="panel-feedback"
                role="tabpanel"
                aria-labelledby="tab-feedback"
                className="ar-window ar-body"
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
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
              </motion.div>
            )}

            {activeTab === "consultora" && props.isOwner && (
              <motion.div
                key="consultora"
                id="panel-consultora"
                role="tabpanel"
                aria-labelledby="tab-consultora"
                className="ar-window ar-body"
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ConsultantReviewBanner
                  analysisId={props.analysisId}
                  seasonName={props.seasonName}
                  canRequestReview={props.canRequestReview}
                  alreadyInReview={props.statusKey === "NEEDS_REVIEW"}
                  hasConsultantNote={Boolean(props.consultantNote)}
                  reviewPriceLabel={props.reviewPriceLabel}
                  paymentsEnabled={props.paymentsEnabled}
                />
                <ConsultantChatInvite
                  analysisId={props.analysisId}
                  consultantName={props.consultantNote?.author}
                  seasonName={props.seasonName}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {tabs.length > 1 && (
            <div className="ar-pager" aria-label="Navegação entre seções">
              <div>
                {prevTab ? (
                  <button
                    type="button"
                    className="ar-pager__btn ar-pager__btn--ghost"
                    onClick={() => openTab(prevTab.id)}
                  >
                    <ArrowLeft size={16} aria-hidden />
                    <span>{prevTab.label}</span>
                  </button>
                ) : null}
              </div>

              <div className="ar-pager__dots" aria-hidden>
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    tabIndex={-1}
                    onClick={() => openTab(t.id)}
                    className={`ar-pager__dot${t.id === activeTab ? " ar-pager__dot--on" : ""}`}
                    title={t.label}
                  />
                ))}
              </div>

              <div>
                {nextTab ? (
                  <button
                    type="button"
                    className="ar-pager__btn ar-pager__btn--next"
                    onClick={() => openTab(nextTab.id)}
                  >
                    <span>{nextTab.label}</span>
                    <ArrowRight size={16} aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          )}

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
