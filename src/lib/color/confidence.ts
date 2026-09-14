export type ConfidenceBreakdown = {
  overall: number;
  byAxis: {
    temperature: number;
    value: number;
    chroma: number;
    contrast: number;
  };
};

/** Confiança do preditor `rules` — nunca afirma certeza absoluta. */
export function calibrateRulesConfidence(input: {
  temperatureScore: number;
  sampleCount: number;
  skinPixelRatio: number;
  detectorProvider: string;
  hasReliableFace: boolean;
  hasHairSample?: boolean;
  contrastScore?: number;
}): number {
  const tempStrength = Math.min(1, Math.abs(input.temperatureScore) / 15);
  const ambiguousUndertone = Math.abs(input.temperatureScore) < 3;
  const sampleStrength = Math.min(1, input.sampleCount / 800);
  const skinStrength = Math.min(1, input.skinPixelRatio / 0.08);
  const faceBoost = input.hasReliableFace ? 0.05 : 0;
  const hairBoost = input.hasHairSample ? 0.03 : 0;
  const contrastBoost =
    input.contrastScore != null && input.contrastScore >= 12 ? 0.02 : 0;
  const heuristicPenalty =
    input.detectorProvider.includes("heuristic") ||
    input.detectorProvider.includes("fallback") ||
    input.detectorProvider === "test"
      ? 0.1
      : 0;
  const ambiguityPenalty = ambiguousUndertone ? 0.18 : 0;

  const raw =
    0.35 * tempStrength +
    0.35 * sampleStrength +
    0.3 * skinStrength +
    faceBoost +
    hairBoost +
    contrastBoost -
    heuristicPenalty -
    ambiguityPenalty;

  // Cap: regras sozinhas não passam de 85%
  return Number(Math.max(0.05, Math.min(0.85, raw)).toFixed(3));
}

/**
 * Calcula confiança por eixo (temperatura, valor, croma, contraste).
 * Permite UI mostrar breakdown: qual eixo é confiável, qual precisa revisar.
 * 
 * @see P0.3 do confidence-pipeline-audit.md
 */
export function calibrateConfidenceByAxis(input: {
  temperatureScore: number;
  sampleCount: number;
  skinPixelRatio: number;
  detectorProvider: string;
  hasReliableFace: boolean;
  hasHairSample?: boolean;
  contrastScore?: number;
  contrastSource?: string;
  lightingWarning?: boolean;
}): ConfidenceBreakdown {
  const tempStrength = Math.min(1, Math.abs(input.temperatureScore) / 15);
  const ambiguousUndertone = Math.abs(input.temperatureScore) < 3;
  const sampleStrength = Math.min(1, input.sampleCount / 800);
  const skinStrength = Math.min(1, input.skinPixelRatio / 0.08);
  const faceBoost = input.hasReliableFace ? 0.05 : 0;
  const heuristicPenalty =
    input.detectorProvider.includes("heuristic") ||
    input.detectorProvider.includes("fallback") ||
    input.detectorProvider === "test"
      ? 0.1
      : 0;

  // Temperatura: forte se |temp| alto, sem ambiguidade, sem luz problemática
  const tempRaw =
    tempStrength * 0.9 +
    (input.hasReliableFace ? 0.05 : 0) -
    (ambiguousUndertone ? 0.3 : 0) -
    (input.lightingWarning ? 0.15 : 0) -
    heuristicPenalty;
  const temperature = Number(Math.max(0.05, Math.min(0.95, tempRaw)).toFixed(3));

  // Valor: depende de cabelo amostrado (profundidade visual), qualidade de face
  const valueRaw =
    0.5 * sampleStrength +
    0.3 * skinStrength +
    (input.hasHairSample ? 0.25 : 0) +
    faceBoost -
    heuristicPenalty -
    (input.lightingWarning ? 0.1 : 0);
  const value = Number(Math.max(0.05, Math.min(0.9, valueRaw)).toFixed(3));

  // Croma: depende de amostras de pele suficientes, detector confiável
  const chromaRaw =
    0.5 * sampleStrength +
    0.4 * skinStrength +
    faceBoost -
    heuristicPenalty -
    (input.lightingWarning ? 0.12 : 0);
  const chroma = Number(Math.max(0.05, Math.min(0.85, chromaRaw)).toFixed(3));

  // Contraste: fonte de contraste (hair/eyes melhor que skin_l), score alto
  const hasGoodContrastSource =
    input.contrastSource === "skin_hair" || input.contrastSource === "skin_eyes";
  const highContrast =
    input.contrastScore != null && input.contrastScore >= 20;
  const contrastRaw =
    (hasGoodContrastSource ? 0.4 : 0.1) +
    (highContrast ? 0.3 : 0.15) +
    0.3 * sampleStrength +
    faceBoost -
    heuristicPenalty;
  const contrast = Number(Math.max(0.05, Math.min(0.9, contrastRaw)).toFixed(3));

  // Overall: média ponderada (temperatura e valor dominam, croma e contraste apoiam)
  const overall = Number(
    Math.max(
      0.05,
      Math.min(
        0.85,
        0.35 * temperature +
          0.3 * value +
          0.2 * chroma +
          0.15 * contrast,
      ),
    ).toFixed(3),
  );

  return {
    overall,
    byAxis: { temperature, value, chroma, contrast },
  };
}

export const REVIEW_CONFIDENCE_THRESHOLD = 0.55;

export function shouldNeedsReview(input: {
  confidence: number;
  temperatureScore: number;
  faceLikeDetected: boolean;
  lightingWarning: boolean;
  usedFaceFallback: boolean;
  roiConsistencyWarning?: boolean;
  qualityBand?: "boa" | "aceitavel" | "ruim";
}): boolean {
  return (
    input.confidence < REVIEW_CONFIDENCE_THRESHOLD ||
    !input.faceLikeDetected ||
    input.lightingWarning ||
    input.usedFaceFallback ||
    Math.abs(input.temperatureScore) < 3 ||
    Boolean(input.roiConsistencyWarning) ||
    input.qualityBand === "ruim"
  );
}

/**
 * Figma specs: high ≥80 / moderate 65–79 / low <65
 */
export function formatConfidence(confidence: number): {
  percent: number;
  band: "baixa" | "moderada" | "alta";
  note: string;
} {
  // Nunca exibir 100% em estimativa automática (cap de regras = 85%)
  const capped = Math.min(confidence, 0.85);
  const percent = Math.round(capped * 100);
  
  // Figma specs: low <65%
  if (percent < 65) {
    return {
      percent,
      band: "baixa",
      note: "revisão recomendada",
    };
  }
  
  // Figma specs: moderate 65–79%
  if (percent < 80) {
    return {
      percent,
      band: "moderada",
      note: "estimativa automática",
    };
  }
  
  // Figma specs: high ≥80%
  return {
    percent,
    band: "alta",
    note: "estimativa automática — validação da consultora confirma",
  };
}
