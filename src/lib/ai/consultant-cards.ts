import type { AnalysisGoalId } from "@/lib/color/goals";
import { getSeasonById } from "@/lib/color/recommendations";
import { contrastBandLabel, SISTER_SEASONS } from "@/lib/color/season-knowledge";
import { presentEvaluation } from "@/lib/knowledge/explain";
import type { EvaluationOpinion, KnowledgeCard } from "@/lib/knowledge/types";
import {
  CHANGE_AREAS,
  consultantPlanSchema,
  type ConsultantPlan,
} from "@/lib/ai/consultant-plan-schema";

const HEX = /^#[0-9A-Fa-f]{6}$/;

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function paletteHexes(seasonId: string): string[] {
  const season = getSeasonById(seasonId);
  const fromUse = (season?.useColors ?? []).filter((h) => HEX.test(h));
  const fromClothes = (season?.clothing ?? [])
    .map((c) => c.hex)
    .filter((h) => HEX.test(h));
  return [...new Set([...fromUse, ...fromClothes])].slice(0, 6);
}

function areaFromCard(
  card: KnowledgeCard,
  goals: string[],
): (typeof CHANGE_AREAS)[number] {
  if (card.goals.includes("olheiras") || goals.includes("olheiras")) return "olheiras";
  if (card.goals.includes("cabelo") || card.axes.includes("hair")) return "cabelo";
  if (card.goals.includes("base")) return "base";
  if (card.goals.includes("maquiagem") || card.axes.includes("visagismo")) {
    return "pele";
  }
  if (card.goals.includes("roupas")) return "roupa";
  if (card.id.includes("hair")) return "cabelo";
  return "roupa";
}

function actionForContrast(contrast: EvaluationOpinion["axes"]["contrast"]) {
  if (contrast === "high") return "exaltar" as const;
  if (contrast === "low") return "suavizar" as const;
  return "manter" as const;
}

export function buildConsultantPlanFromCards(opts: {
  intention: string;
  goals: AnalysisGoalId[] | string[];
  seasonId: string;
  seasonName: string;
  undertoneLabel: string;
  cards: KnowledgeCard[];
  opinion: EvaluationOpinion;
}): ConsultantPlan {
  const { opinion, seasonId, seasonName, undertoneLabel, intention, cards } = opts;
  const view = presentEvaluation(opinion, seasonName, seasonId);
  const colors = paletteHexes(seasonId);
  const contrast = contrastBandLabel(opinion.axes.contrast);
  const sisterId = SISTER_SEASONS[seasonId];
  const sisterName = sisterId ? getSeasonById(sisterId)?.namePt : undefined;

  const assessment = clip(
    `A partir da sua intenção (“${intention}”), o plano segue ${seasonName} (subtom ${undertoneLabel}). ${view.why}`,
    800,
  );

  const seasonAlignment = clip(
    sisterName
      ? `${seasonName} é a cartela medida. Irmã ${sisterName} pode emprestar cor pontual; perto do rosto manda a sua.`
      : `${seasonName} é a cartela medida — o plano não troca a estação.`,
    500,
  );

  const priorities = [
    {
      trait: "Intenção",
      action: "exaltar" as const,
      why: clip(`Priorizar o que você pediu: ${intention}`, 400),
      confidence: opinion.needsReview ? 0.55 : 0.82,
    },
    {
      trait: "Subtom",
      action: "manter" as const,
      why: clip(
        `Temperatura ${undertoneLabel} vem da pele nas bochechas; maquiagem e metais acompanham isso.`,
        400,
      ),
      confidence: opinion.axes.temperatureAmbiguous ? 0.45 : 0.8,
    },
    {
      trait: "Contraste",
      action: actionForContrast(opinion.axes.contrast),
      why: clip(
        `Contraste ${contrast} define quanto marcar (make, óculos, cabelo) perto do rosto.`,
        400,
      ),
      confidence: 0.75,
    },
  ].slice(0, 6);

  const usedIds = new Set<string>();
  const changes = cards.slice(0, 8).map((card, i) => {
    let id = card.id.replace(/[^a-z0-9_-]/gi, "-").slice(0, 40) || `dica-${i + 1}`;
    if (usedIds.has(id)) id = `${id}-${i + 1}`.slice(0, 40);
    usedIds.add(id);
    const suggestion = clip(card.body, 500);
    const doText = clip(card.do[0] ?? card.body, 300);
    const dontText = clip(
      card.dont[0] ?? "Não trocar a cartela medida por gosto ou tutorial.",
      300,
    );
    return {
      id,
      area: areaFromCard(card, opts.goals.map(String)),
      suggestion,
      colors,
      do: doText,
      dont: dontText,
    };
  });

  const fallbackChange = {
    id: "cartela-1",
    area: "roupa" as const,
    suggestion: clip(
      `Perto do rosto, use cores de ${seasonName}. Fora da paleta, deixe a peça longe da pele.`,
      500,
    ),
    colors,
    do: "Priorizar a paleta medida em gola, lenço e brinco.",
    dont: "Não colocar a cor mais oposta à cartela no decote sem um item da paleta no meio.",
  };

  const plan = {
    assessment,
    priorities,
    changes: changes.length > 0 ? changes : [fallbackChange],
    seasonAlignment,
    needsHumanReview: opinion.needsReview,
  };

  return consultantPlanSchema.parse(plan);
}
