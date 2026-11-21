import { buildRecommendations, getSeasonById } from "@/lib/color/recommendations";
import { formatConfidence } from "@/lib/color/confidence";
import {
  ANALYSIS_GOAL_OPTIONS,
  parseAnalysisGoals,
  wantsSkinCorrection,
} from "@/lib/color/goals";
import { buildSkinCorrection } from "@/lib/color/skin-correction";
import type { SkinCorrectionBlock } from "@/lib/color/skin-correction";
import { evaluateWithRubric } from "@/lib/knowledge/evaluate";
import { presentEvaluation, type EvaluationView } from "@/lib/knowledge/explain";
import type { ColorFeatures, PhotoQuality } from "@/lib/color/types";
import type {
  AnalysisResultViewProps,
  RecItem,
} from "@/components/analysis/AnalysisResultView";
import { getVtoRuntimeInfo } from "@/lib/vto/simulate";

const contextLabel: Record<string, string> = {
  casual: "Casual",
  trabalho: "Trabalho",
  noite: "Noite",
};

type AnalysisRecord = {
  id: string;
  userId: string;
  status: "PENDING" | "READY" | "NEEDS_REVIEW" | "APPROVED";
  context: string;
  goals: string[];
  intention: string | null;
  imagePath: string;
  confidence: number | null;
  undertoneLabel: string | null;
  seasonId: string | null;
  overrideSeasonId: string | null;
  features: unknown;
  photoQuality: unknown;
  recommendations: unknown;
  season: { id: string; namePt: string; description: string; temperature: string } | null;
  overrideSeason: {
    id: string;
    namePt: string;
    description: string;
    temperature: string;
  } | null;
  reviews: Array<{
    notes: string | null;
    createdAt: Date;
    reviewer: { name: string | null } | null;
  }>;
  feedbackEvents: Array<{ target: string; kind: string }>;
};

type RecJson = {
  description?: string;
  undertoneHint?: string;
  useColors?: string[];
  avoidColors?: string[];
  rankedUse?: Array<{ hex: string; score: number; why: string }>;
  clothing?: RecItem[];
  lipstick?: RecItem[];
  eyeshadow?: RecItem[];
  base?: RecItem[];
  skinCorrection?: SkinCorrectionBlock;
  ethicalNote?: string;
  goals?: string[];
  coaching?: {
    sisterNote?: string | null;
    styleTips?: string[];
    makeupTips?: string[];
    hairTips?: string[];
    avoidNotes?: string[];
    offPaletteTips?: string[];
    contrastTip?: string | null;
    colorimetryHairNotes?: string[];
    attentionRedirectTips?: string[];
  };
  evaluation?: {
    why?: string;
    axes?: EvaluationView["axes"];
    checks?: EvaluationView["checks"];
    reviewReasons?: string[];
    needsReview?: boolean;
  };
};

export function buildAnalysisResultViewProps(input: {
  analysis: AnalysisRecord;
  isOwner: boolean;
  mode: "user" | "staff";
  seasons?: Array<{ id: string; namePt: string }>;
}): AnalysisResultViewProps {
  const { analysis, isOwner, mode } = input;
  const isStaff = mode === "staff";
  const season = analysis.overrideSeason || analysis.season;
  const rec = analysis.recommendations as RecJson | null;

  const features = analysis.features as {
    temperatureScore?: number;
    labUndertone?: { L: number; a: number; b: number };
    contrastScore?: number;
    contrastSource?: string;
  } | null;

  const goals = parseAnalysisGoals(
    rec?.goals?.length ? rec.goals : analysis.goals,
  );

  const skinCorrection: SkinCorrectionBlock | null =
    (rec?.skinCorrection as SkinCorrectionBlock | null | undefined) ??
    (season && wantsSkinCorrection(goals)
      ? buildSkinCorrection({
          temperature: season.temperature === "cool" ? "cool" : "warm",
          temperatureScore: features?.temperatureScore,
          skinL: features?.labUndertone?.L,
          goals,
        })
      : null);

  const goalLabels = ANALYSIS_GOAL_OPTIONS.filter((o) => goals.includes(o.id)).map(
    (o) => o.label,
  );

  const quality = analysis.photoQuality as {
    warnings?: string[];
    failedTips?: string[];
    detectorProvider?: string;
    qualityBand?: "boa" | "aceitavel" | "ruim";
  } | null;

  let evaluation: EvaluationView | null = null;
  const storedFeatures = analysis.features as ColorFeatures | null;
  if (storedFeatures?.labUndertone && season) {
    const opinion = evaluateWithRubric({
      features: storedFeatures,
      photoQuality: analysis.photoQuality as PhotoQuality | undefined,
      seasonId: season.id,
      goals,
    });
    evaluation = presentEvaluation(opinion, season.namePt, season.id);
  } else if (rec?.evaluation?.why && rec.evaluation.axes?.length) {
    evaluation = {
      rubricVersion: "1.0.0",
      why: rec.evaluation.why,
      axes: rec.evaluation.axes,
      checks: rec.evaluation.checks || [],
      reviewReasons: rec.evaluation.reviewReasons || [],
      needsReview: Boolean(rec.evaluation.needsReview),
    };
  }

  const confidenceUi =
    analysis.confidence != null ? formatConfidence(analysis.confidence) : null;
  const vto = getVtoRuntimeInfo();
  const useColors = rec?.useColors || [];
  const avoidColors = rec?.avoidColors || [];

  const simulationColors = [
    ...(rec?.rankedUse || []).map((c) => c.hex),
    ...useColors,
    ...(rec?.clothing || []).map((c) => c.hex),
    ...(rec?.lipstick || []).map((c) => c.hex),
  ].filter((hex, i, arr) => Boolean(hex) && arr.indexOf(hex) === i);

  const contextKey =
    analysis.context === "trabalho" || analysis.context === "noite"
      ? analysis.context
      : "casual";
  const seasonDef = season ? getSeasonById(season.id) : undefined;
  const liveCoaching = seasonDef
    ? buildRecommendations(seasonDef, contextKey, {
        goals,
        contrastScore: features?.contrastScore,
        temperatureScore: features?.temperatureScore,
        skinLab: features?.labUndertone,
      }).coaching
    : rec?.coaching;
  const coaching = liveCoaching ?? rec?.coaching;

  const attentionTitle = [
    goals.includes("olheiras") ? "olheiras" : null,
    goals.includes("manchas") ? "manchas" : null,
    goals.includes("vermelhidao") ? "vermelhidão" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const coachingBlocks = (
    [
      ["Estilo e roupas", coaching?.styleTips],
      ["Maquiagem", coaching?.makeupTips],
      ["Cabelo", coaching?.hairTips],
      ...(isStaff
        ? ([["Colorimetria do fio", coaching?.colorimetryHairNotes]] as const)
        : []),
      [
        attentionTitle
          ? `Suavizar ${attentionTitle}`
          : "Suavizar manchas, espinhas ou olheiras",
        coaching?.attentionRedirectTips,
      ],
      ["Evitar", coaching?.avoidNotes],
      ["Cores fora da paleta", coaching?.offPaletteTips],
    ] as const
  )
    .filter(([, tips]) => (tips || []).length > 0)
    .map(([title, tips]) => ({ title, tips: [...(tips || [])] }));

  /* Looks sugeridos: ocultos na UI por enquanto (design fraco). */
  const lookGroups: Array<{ title: string; items: RecItem[] }> = [];

  const feedbackAvailable =
    isOwner &&
    (analysis.status === "READY" ||
      analysis.status === "NEEDS_REVIEW" ||
      analysis.status === "APPROVED") &&
    Boolean(season);

  const simulationAvailable =
    isOwner && simulationColors.length > 0 && vto.provider === "mock";

  const navItems = [
    evaluation ? { href: "#leitura", label: "Leitura" } : null,
    useColors.length > 0 ? { href: "#paleta", label: "Paleta" } : null,
    coachingBlocks.length > 0
      ? { href: "#orientacoes", label: "Orientações" }
      : null,
    skinCorrection ? { href: "#cuidados", label: "Cuidados" } : null,
    feedbackAvailable ? { href: "#feedback", label: "Feedback" } : null,
    simulationAvailable ? { href: "#simulacao", label: "Simulação" } : null,
    isOwner ? { href: "#consultora", label: "Consultora" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  const consultantNote = analysis.reviews[0]?.notes
    ? {
        author: analysis.reviews[0].reviewer?.name || null,
        date: analysis.reviews[0].createdAt.toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        text: analysis.reviews[0].notes,
      }
    : null;

  return {
    analysisId: analysis.id,
    photoUrl: `/api/uploads/${analysis.imagePath}`,
    statusKey: analysis.status,
    seasonName: season?.namePt || null,
    seasonDescription: rec?.description || season?.description || null,
    undertoneLabel: analysis.undertoneLabel || null,
    undertoneHint: rec?.undertoneHint || null,
    sisterNote: coaching?.sisterNote || rec?.coaching?.sisterNote || null,
    evaluation: evaluation
      ? {
          why: evaluation.why,
          axes: evaluation.axes,
          checks: evaluation.checks,
          reviewReasons: evaluation.reviewReasons,
          needsReview: evaluation.needsReview,
        }
      : null,
    confidencePercent: confidenceUi?.percent ?? null,
    confidenceBand: confidenceUi?.band ?? null,
    confidenceNote: confidenceUi?.note ?? null,
    lowConfidenceWarning: confidenceUi?.band === "baixa",
    intention: analysis.intention || null,
    goalLabels,
    contextLabel: contextLabel[analysis.context] || analysis.context || null,
    consultantNote,
    useColors,
    rankedUse: (rec?.rankedUse || []).map((r) => ({ hex: r.hex, why: r.why })),
    avoidColors,
    coachingBlocks,
    skinCorrection: skinCorrection
      ? {
          intro: skinCorrection.intro,
          items: skinCorrection.items.map((i) => ({
            hex: i.hex,
            label: i.label,
            role: i.role,
            why: i.why,
          })),
        }
      : null,
    ethicalNote:
      rec?.ethicalNote ||
      (skinCorrection
        ? "Não é diagnóstico dermatológico nem substitui consultoria presencial."
        : null),
    lookGroups,
    navItems,
    isOwner,
    isStaff,
    /* Avisos internos de validação só no desk; cliente vê só dicas de foto. */
    qualityWarnings: isStaff ? quality?.warnings || [] : [],
    qualityFailedTips: quality?.failedTips || [],
    canRequestReview: isOwner && analysis.status === "READY",
    simulation: simulationAvailable
      ? {
          colors: simulationColors,
          vtoProvider: vto.provider,
          aiReady: vto.aiReady,
        }
      : null,
    feedback: feedbackAvailable
      ? {
          seasonName: season!.namePt,
          clothing: rec?.clothing || [],
          lipstick: rec?.lipstick || [],
          eyeshadow: rec?.eyeshadow || [],
          base: rec?.base || [],
          corrections: (skinCorrection?.items || []).map((i) => ({
            hex: i.hex,
            label: i.label,
            target: i.target,
          })),
          initialVotes: analysis.feedbackEvents.map((e) => ({
            target: e.target,
            kind: e.kind as "HELPED" | "DID_NOT_HELP",
          })),
        }
      : null,
    staffTech: isStaff
      ? {
          context: analysis.context,
          contrastScore: features?.contrastScore ?? null,
          contrastSource: features?.contrastSource ?? null,
          detectorProvider: quality?.detectorProvider ?? null,
          qualityBand: quality?.qualityBand ?? null,
        }
      : null,
    staffReview:
      isStaff && analysis.status !== "APPROVED"
        ? {
            seasons: input.seasons || [],
            currentSeasonId: analysis.overrideSeasonId || analysis.seasonId,
          }
        : null,
  };
}
