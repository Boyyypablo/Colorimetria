import type { ColorFeatures, LabColor } from "../types";
import type { ColorPredictor } from "./types";
import { calibrateRulesConfidence, calibrateConfidenceByAxis } from "../confidence";

function contrastBand(score: number): "low" | "medium" | "high" {
  if (score >= 28) return "high";
  if (score <= 14) return "low";
  return "medium";
}

function hairTemperature(lab: LabColor): number {
  return lab.b * 0.7 + lab.a * 0.3;
}

/**
 * Eixos efetivos: pele clara + cabelo escuro ≠ “estação clara/suave”.
 * Caso típico: Inverno Brilhante (contraste alto) classificado errado como Primavera Clara.
 */
export function resolveSeasonAxes(features: ColorFeatures) {
  const contrast = contrastBand(features.contrastScore);
  let temperatureScore = features.temperatureScore;
  let tempNudged = false;

  let value: "light" | "medium" | "deep" =
    features.valueScore >= 66
      ? "light"
      : features.valueScore <= 50
        ? "deep"
        : "medium";

  const chroma: "bright" | "soft" | "muted" =
    features.chromaScore >= 20
      ? "bright"
      : features.chromaScore <= 13
        ? "muted"
        : "soft";

  const hair = features.labHair;
  if (hair) {
    const deltaLH = features.valueScore - hair.L;
    const hairTemp = hairTemperature(hair);

    // Profundidade visual (material: beleza escura / contraste pele×cabelo)
    if (hair.L <= 45 && deltaLH >= 18) {
      if (value === "light") {
        value = contrast === "high" ? "deep" : "medium";
      } else if (value === "medium" && contrast === "high" && hair.L <= 36) {
        value = "deep";
      }
    }

    // Cabelo escuro + contraste alto: luz dourada na pele não deve virar
    // primavera clara / outono — prioriza frio se o fio não for quente.
    if (contrast === "high" && hair.L <= 42 && deltaLH >= 18) {
      if (hairTemp < 5 && temperatureScore > -3) {
        temperatureScore = -Math.max(6, 9 - Math.abs(hairTemp));
        tempNudged = true;
      } else if (
        hairTemp < 8 &&
        temperatureScore >= 0 &&
        temperatureScore < 18
      ) {
        temperatureScore = -Math.max(5, 10 - Math.abs(hairTemp));
        tempNudged = true;
      }
    }
  } else if (contrast === "high" && value === "light") {
    // Sem amostra de cabelo, contraste alto já impede “clara delicada”
    value = "medium";
  }

  // Contraste alto nunca fica em croma “apagado” para árvore soft
  let chromaEff = chroma;
  if (contrast === "high" && chroma === "soft") {
    chromaEff = "bright";
  }

  const warm = temperatureScore >= 0;

  return {
    warm,
    temperatureScore,
    tempNudged,
    value,
    chroma: chromaEff,
    contrast,
  };
}

export function pickSeason(axes: ReturnType<typeof resolveSeasonAxes>): string {
  const { warm, value, chroma, contrast } = axes;

  if (warm) {
    if (value === "light" && chroma === "bright") {
      return contrast === "low" ? "light_spring" : "bright_spring";
    }
    if (value === "light" && chroma === "muted") {
      return contrast === "high" ? "bright_spring" : "soft_autumn";
    }
    if (value === "light") {
      // soft + light: contraste alto → brilhante, nunca primavera clara
      return contrast === "high" ? "bright_spring" : "light_spring";
    }
    if (value === "deep") {
      return contrast === "low" ? "true_autumn" : "deep_autumn";
    }
    if (chroma === "muted") return "soft_autumn";
    if (chroma === "bright") {
      return contrast === "high" ? "true_spring" : "true_autumn";
    }
    return "true_autumn";
  }

  // cool
  if (value === "light" && chroma === "muted") return "soft_summer";
  if (value === "light" && (chroma === "bright" || contrast === "high")) {
    return "bright_winter";
  }
  if (value === "light") return "light_summer";
  if (value === "deep" && chroma === "bright") return "bright_winter";
  if (value === "deep" && chroma === "muted") return "deep_winter";
  if (value === "deep") {
    return contrast === "high" ? "bright_winter" : "true_winter";
  }
  if (chroma === "muted") return "soft_summer";
  if (chroma === "bright" && contrast === "high") return "true_winter";
  return "true_summer";
}

/** Árvore de regras — baseline com value/chroma/contraste (cabelo/pele). */
export class RulesColorPredictor implements ColorPredictor {
  readonly id = "rules";

  predict(features: ColorFeatures) {
    const axes = resolveSeasonAxes(features);
    const seasonId = pickSeason(axes);

    const undertoneLabel = axes.warm
      ? axes.temperatureScore > 8
        ? "quente (dourado)"
        : "quente suave"
      : axes.temperatureScore < -8
        ? "frio (rosado/azulado)"
        : "frio suave";

    const hasReliableFace = Boolean(
      features.faceBox && !features.detectorProvider.includes("fallback"),
    );
    const hasHairSample = Boolean(features.labHair);

    let confidence = calibrateRulesConfidence({
      temperatureScore: axes.temperatureScore,
      sampleCount: features.sampleCount,
      skinPixelRatio: features.skinPixelRatio,
      detectorProvider: features.detectorProvider,
      hasReliableFace,
      hasHairSample,
      contrastScore: features.contrastScore,
    });

    // P0.3: Calcular breakdown por eixo
    const confidenceBreakdown = calibrateConfidenceByAxis({
      temperatureScore: axes.temperatureScore,
      sampleCount: features.sampleCount,
      skinPixelRatio: features.skinPixelRatio,
      detectorProvider: features.detectorProvider,
      hasReliableFace,
      hasHairSample,
      contrastScore: features.contrastScore,
      contrastSource: features.contrastSource,
      lightingWarning: false, // será preenchido pelo classifier
    });

    // Nudge de temperatura = menos certeza (luz/cabelo)
    if (axes.tempNudged) {
      confidence = Number(Math.min(confidence, 0.62).toFixed(3));
    }

    return { seasonId, undertoneLabel, confidence, confidenceBreakdown };
  }
}
