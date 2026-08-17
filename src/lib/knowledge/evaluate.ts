import { KNOWLEDGE_CARDS } from "../../../data/knowledge/cards";
import { RUBRIC_CHECKS, RUBRIC_VERSION, TEMPERATURE_AMBIGUOUS_ABS } from "../../../data/knowledge/rubric";
import { resolveSeasonAxes } from "@/lib/color/predictor/rules";
import type { AnalysisGoalId } from "@/lib/color/goals";
import type { ColorFeatures, PhotoQuality } from "@/lib/color/types";
import { retrieveKnowledgeCards, getCardById } from "@/lib/knowledge/retrieve";
import type {
  EvaluationCheckResult,
  EvaluationOpinion,
  KnowledgeAxis,
  RubricCheckId,
} from "@/lib/knowledge/types";

function checkPass(
  id: RubricCheckId,
  features: ColorFeatures,
  photo: PhotoQuality | undefined,
  axes: ReturnType<typeof resolveSeasonAxes>,
): Pick<EvaluationCheckResult, "pass" | "note"> {
  switch (id) {
    case "photo_usable": {
      const intake = photo?.intake;
      const bad =
        photo?.qualityBand === "ruim" ||
        photo?.lightingWarning === true ||
        intake?.artificialLight === true ||
        intake?.makeupOnPhoto === true;
      return {
        pass: !bad,
        note: bad
          ? intake?.makeupOnPhoto
            ? "Maquiagem na foto — revisar subtom, não fechar com certeza."
            : intake?.artificialLight || photo?.lightingWarning
              ? "Luz inadequada — revisar, não fechar com certeza."
              : "Luz ou qualidade insuficientes — revisar, não fechar com certeza."
          : "Foto em banda aceitável para medir.",
      };
    }
    case "face_evidence": {
      const ok = Boolean(photo?.faceDetected) && !photo?.usedFaceFallback;
      return {
        pass: ok,
        note: ok
          ? "Rosto com evidência do detector."
          : "Sem rosto confiável ou fallback — NEEDS_REVIEW.",
      };
    }
    case "temperature_evidence": {
      const ambiguous = Math.abs(axes.temperatureScore) < TEMPERATURE_AMBIGUOUS_ABS;
      if (axes.tempNudged) {
        return {
          pass: true,
          note: "Temperatura ajustada com cabelo/contraste (possível luz quente na pele).",
        };
      }
      return {
        pass: !ambiguous,
        note: ambiguous
          ? "Subtom ambíguo (|temp| baixo) — não forçar quente/frio extremo."
          : `Temperatura ${axes.warm ? "quente" : "fria"} com evidência nas bochechas.`,
      };
    }
    case "value_with_hair": {
      const highContrast = axes.contrast === "high";
      const noHair = features.labHair == null;
      const dyed = Boolean(photo?.intake?.dyedHair);
      if (highContrast && noHair) {
        return {
          pass: false,
          note: "Contraste alto sem amostra de cabelo — profundidade pode estar incompleta.",
        };
      }
      if (highContrast && axes.value === "light") {
        return {
          pass: false,
          note: "Contraste alto com valor claro: revisar (pele clara ≠ estação clara).",
        };
      }
      return {
        pass: true,
        note: dyed
          ? "Cabelo tingido declarado — valor/contraste usam o fio atual."
          : `Valor efetivo: ${axes.value}.`,
      };
    }
    case "contrast_sampled": {
      const sourced = features.contrastSource !== "skin_l" || Boolean(features.labHair);
      return {
        pass: sourced || axes.contrast !== "high",
        note: sourced
          ? `Contraste ${axes.contrast} (${features.contrastSource}).`
          : "Contraste só pelo L da pele — amostrar cabelo/olhos na próxima foto.",
      };
    }
    case "season_plus_sister": {
      return {
        pass: true,
        note: "Entregar estação medida e citar cartela irmã quando existir.",
      };
    }
    case "goals_only": {
      return {
        pass: true,
        note: "Visagismo e dicas de make/cabelo só se o objetivo pedir; visagismo não troca a cartela.",
      };
    }
    default: {
      const _never: never = id;
      return { pass: false, note: String(_never) };
    }
  }
}

function axesForCards(
  axes: ReturnType<typeof resolveSeasonAxes>,
  checks: EvaluationCheckResult[],
): KnowledgeAxis[] {
  const failed = new Set(
    checks.filter((c) => !c.pass).map((c) => {
      const def = RUBRIC_CHECKS.find((r) => r.id === c.id);
      return def?.axis;
    }),
  );
  const list: KnowledgeAxis[] = [
    "temperature",
    "value",
    "chroma",
    "contrast",
    "harmony",
    "photo_quality",
  ];
  if (failed.has("visagismo")) list.push("visagismo");
  if (failed.has("hair")) list.push("hair");
  if (axes.tempNudged) list.push("photo_quality");
  if (axes.contrast === "high") list.push("contrast");
  return [...new Set(list)];
}

export function evaluateWithRubric(input: {
  features: ColorFeatures;
  photoQuality?: PhotoQuality;
  seasonId: string;
  goals?: AnalysisGoalId[] | string[];
}): EvaluationOpinion {
  const axesResolved = resolveSeasonAxes(input.features);
  const checks: EvaluationCheckResult[] = RUBRIC_CHECKS.map((def) => {
    const result = checkPass(
      def.id,
      input.features,
      input.photoQuality,
      axesResolved,
    );
    return { id: def.id, label: def.label, pass: result.pass, note: result.note };
  });

  const reviewReasons = checks.filter((c) => !c.pass).map((c) => c.note);
  const photoForcesReview =
    input.photoQuality?.qualityBand === "ruim" ||
    input.photoQuality?.faceDetected === false ||
    input.photoQuality?.usedFaceFallback === true;

  const retrieveAxes = axesForCards(axesResolved, checks);
  if (input.goals?.includes("cabelo")) retrieveAxes.push("hair");
  if (
    input.goals?.includes("maquiagem") ||
    input.goals?.includes("olheiras") ||
    input.goals?.includes("manchas")
  ) {
    retrieveAxes.push("visagismo");
  }

  const cards = retrieveKnowledgeCards({
    axes: retrieveAxes,
    seasonId: input.seasonId,
    goals: input.goals,
    limit: 10,
  });

  const makeupLike =
    input.goals?.includes("maquiagem") ||
    input.goals?.includes("olheiras") ||
    input.goals?.includes("manchas");
  const pinned = [
    "sister-palette",
    axesResolved.tempNudged ? "false-warm-light" : null,
    input.goals?.includes("cabelo") ? "hair-complements" : null,
    makeupLike ? "visagismo-not-season" : null,
    makeupLike ? "face-shapes-contour" : null,
    makeupLike ? "features-not-defects" : null,
  ];
  for (const id of pinned) {
    if (!id) continue;
    if (cards.some((c) => c.id === id)) continue;
    const extra = getCardById(id);
    if (extra) cards.push(extra);
  }
  for (const card of KNOWLEDGE_CARDS) {
    if (card.seasonIds.length === 1 && card.seasonIds[0] === input.seasonId) {
      if (!cards.some((c) => c.id === card.id)) cards.push(card);
    }
  }

  return {
    rubricVersion: RUBRIC_VERSION,
    axes: {
      temperature: axesResolved.warm ? "warm" : "cool",
      temperatureScore: axesResolved.temperatureScore,
      temperatureAmbiguous:
        Math.abs(axesResolved.temperatureScore) < TEMPERATURE_AMBIGUOUS_ABS &&
        !axesResolved.tempNudged,
      tempNudged: axesResolved.tempNudged,
      value: axesResolved.value,
      chroma: axesResolved.chroma,
      contrast: axesResolved.contrast,
    },
    checks,
    needsReview: photoForcesReview || reviewReasons.length > 0,
    reviewReasons,
    cardIds: [...new Set(cards.map((c) => c.id))],
  };
}
