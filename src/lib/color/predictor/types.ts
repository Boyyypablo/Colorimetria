import type { ClassificationResult, ColorFeatures } from "../types";
import type { ConfidenceBreakdown } from "../confidence";

/**
 * Preditor de estação — trocável via COLOR_PREDICTOR.
 * Hoje: rules. Futuro: tabular-v1 (modelo treinado).
 */
export interface ColorPredictor {
  readonly id: string;
  predict(features: ColorFeatures): Pick<
    ClassificationResult,
    "seasonId" | "undertoneLabel" | "confidence"
  > & {
    confidenceBreakdown?: ConfidenceBreakdown;
  };
}

export type ColorPredictorId = "rules" | "tabular-v1";

export function resolvePredictorId(
  raw = process.env.COLOR_PREDICTOR,
): ColorPredictorId {
  const id = (raw || "rules").toLowerCase();
  if (id === "tabular-v1") return "tabular-v1";
  return "rules";
}
