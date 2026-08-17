import { notFound, redirect } from "next/navigation";
import { StudioHeader } from "@/components/studio/StudioHeader";
import {
  AnalysisResultView,
  type AnalysisResultViewProps,
  type RecItem,
} from "@/components/analysis/AnalysisResultView";
import { auth } from "@/lib/auth";
import { buildSkinCorrection } from "@/lib/color/skin-correction";
import { buildRecommendations, getSeasonById } from "@/lib/color/recommendations";
import { formatConfidence } from "@/lib/color/confidence";
import {
  ANALYSIS_GOAL_OPTIONS,
  parseAnalysisGoals,
  wantsSkinCorrection,
} from "@/lib/color/goals";
import { parseConsultantPlan } from "@/lib/ai/consultant";
import {
  consultantChangeTarget,
  type ConsultantPlanMeta,
} from "@/lib/ai/consultant-plan-schema";
import { evaluateWithRubric } from "@/lib/knowledge/evaluate";
import { presentEvaluation, type EvaluationView } from "@/lib/knowledge/explain";
import type { ColorFeatures, PhotoQuality } from "@/lib/color/types";
import { prisma } from "@/lib/db/prisma";
import type { SkinCorrectionBlock } from "@/lib/color/skin-correction";
import { getVtoRuntimeInfo } from "@/lib/vto/simulate";
import { attachGarments } from "@/lib/wardrobe/looks";

type Params = { params: Promise<{ id: string }> };

const statusLabelUser: Record<string, string> = {
  PENDING: "Processando",
  READY: "Pronto",
  NEEDS_REVIEW: "Em revisão",
  APPROVED: "Validado",
};

const statusLabelStaff: Record<string, string> = {
  PENDING: "Processando",
  READY: "Pronto (sem revisão)",
  NEEDS_REVIEW: "Em revisão",
  APPROVED: "Validado pela consultora",
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  PENDING: { color: "#b8a040", bg: "#fdf8e8" },
  READY: { color: "var(--lp-sage)", bg: "#eff4f1" },
  NEEDS_REVIEW: { color: "var(--lp-terracotta)", bg: "#fdf0eb" },
  APPROVED: { color: "var(--lp-sage)", bg: "#eff4f1" },
};

const contextLabel: Record<string, string> = {
  casual: "Casual",
  trabalho: "Trabalho",
  noite: "Noite",
};

export default async function AnalysisPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: {
      season: true,
      overrideSeason: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { reviewer: { select: { name: true } } },
      },
      feedbackEvents: {
        orderBy: { createdAt: "asc" },
        select: { target: true, kind: true },
      },
    },
  });

  if (!analysis) notFound();

  const isOwner = analysis.userId === session.user.id;
  const isStaff =
    session.user.role === "CONSULTANT" || session.user.role === "ADMIN";
  if (!isOwner && !isStaff) redirect("/dashboard");

  const season = analysis.overrideSeason || analysis.season;
  const rec = analysis.recommendations as {
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
      axes?: Array<{
        id: string;
        label: string;
        value: string;
        hint?: string;
        uncertain?: boolean;
      }>;
      checks?: Array<{ id: string; label: string; pass: boolean; note: string }>;
      reviewReasons?: string[];
      needsReview?: boolean;
    };
  } | null;

  const features = analysis.features as {
    temperatureScore?: number;
    labUndertone?: { L: number; a: number; b: number };
    contrastScore?: number;
    contrastSource?: string;
  } | null;

  const goals = parseAnalysisGoals(
    (rec as { goals?: string[] } | null)?.goals?.length
      ? (rec as { goals: string[] }).goals
      : analysis.goals,
  );

  const consultantPlan = parseConsultantPlan(analysis.consultantPlan);
  const consultantMeta =
    (analysis.consultantPlanMeta as ConsultantPlanMeta | null) ?? null;

  const skinCorrection: SkinCorrectionBlock | null = consultantPlan
    ? (rec?.skinCorrection as SkinCorrectionBlock | null | undefined) ?? null
    : (rec?.skinCorrection as SkinCorrectionBlock | null | undefined) ??
      (season && wantsSkinCorrection(goals)
        ? buildSkinCorrection({
            temperature: season.temperature === "cool" ? "cool" : "warm",
            temperatureScore: features?.temperatureScore,
            skinL: features?.labUndertone?.L,
            goals,
          })
        : null);

  const goalLabels = ANALYSIS_GOAL_OPTIONS.filter((o) =>
    goals.includes(o.id),
  ).map((o) => o.label);

  const seasons = await prisma.seasonPalette.findMany({
    select: { id: true, namePt: true },
    orderBy: { namePt: "asc" },
  });

  const quality = analysis.photoQuality as {
    warnings?: string[];
    faceDetected?: boolean;
    detectorProvider?: string;
    usedFaceFallback?: boolean;
    qualityBand?: "boa" | "aceitavel" | "ruim";
    failedTips?: string[];
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

  const statusLabels = isStaff ? statusLabelStaff : statusLabelUser;

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

  const lookGroups: Array<{ title: string; items: RecItem[] }> = [
    { title: "Roupas", items: attachGarments(rec?.clothing || [], contextKey) },
    { title: "Batons", items: rec?.lipstick || [] },
    {
      title: "Sombras e base",
      items: [...(rec?.eyeshadow || []), ...(rec?.base || [])],
    },
  ].filter((g) => g.items.length > 0);

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
    consultantPlan ? { href: "#plano", label: "Plano" } : null,
    useColors.length > 0 ? { href: "#paleta", label: "Paleta" } : null,
    coachingBlocks.length > 0 ? { href: "#orientacoes", label: "Orientações" } : null,
    lookGroups.length > 0 ? { href: "#looks", label: "Looks" } : null,
    skinCorrection ? { href: "#cuidados", label: "Cuidados" } : null,
    feedbackAvailable ? { href: "#feedback", label: "Feedback" } : null,
    simulationAvailable ? { href: "#simulacao", label: "Simulação" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  let planStatusNote: string | null = null;
  if (consultantMeta?.status === "error") {
    planStatusNote = "A consultora não concluiu o plano — mostramos a paleta medida.";
  } else if (consultantMeta?.status === "skipped") {
    planStatusNote =
      "Plano personalizado indisponível — entregamos a colorimetria medida.";
  }

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

  const statusStyle = STATUS_STYLE[analysis.status] ?? STATUS_STYLE.PENDING;

  const viewProps: AnalysisResultViewProps = {
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
    planStatusNote,
    plan: consultantPlan
      ? {
          assessment: consultantPlan.assessment,
          seasonAlignment: consultantPlan.seasonAlignment,
          needsHumanReview: consultantPlan.needsHumanReview,
          priorities: consultantPlan.priorities,
          changes: consultantPlan.changes,
        }
      : null,
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
    qualityWarnings: quality?.warnings || [],
    qualityFailedTips: quality?.failedTips || [],
    canRequestReview: isOwner && analysis.status === "READY",
    simulation: simulationAvailable
      ? { colors: simulationColors, vtoProvider: vto.provider, aiReady: vto.aiReady }
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
          aiChanges: (consultantPlan?.changes || []).map((c) => ({
            id: c.id,
            label: c.suggestion,
            target: consultantChangeTarget(c.id),
            hex: c.colors[0],
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
          consultantStatus: consultantMeta?.status ?? null,
          usedVision: Boolean(consultantMeta?.usedVision),
          consultantError: consultantMeta?.error ?? null,
        }
      : null,
    staffReview: isStaff
      ? {
          seasons,
          currentSeasonId: analysis.overrideSeasonId || analysis.seasonId,
        }
      : null,
  };

  return (
    <main className="studio">
      <StudioHeader
        backHref="/dashboard"
        backLabel="Minhas análises"
        title="Resultado"
        rightSlot={
          <div className="studio-header__status" style={{ background: statusStyle.bg }}>
            <span
              className="studio-header__status-dot"
              style={{ background: statusStyle.color }}
            />
            <span className="studio-header__status-label" style={{ color: statusStyle.color }}>
              {statusLabels[analysis.status]}
            </span>
          </div>
        }
      />
      <AnalysisResultView {...viewProps} />
    </main>
  );
}
