import { shouldNeedsReview } from "./confidence";
import type { ClassificationResult, PhotoQuality } from "./types";

export type PhotoIntake = {
  makeupOnPhoto: boolean;
  dyedHair: boolean;
  artificialLight: boolean;
};

export function parsePhotoIntake(form: FormData): PhotoIntake {
  return {
    makeupOnPhoto: form.get("makeupOnPhoto") === "true",
    dyedHair: form.get("dyedHair") === "true",
    artificialLight: form.get("artificialLight") === "true",
  };
}

export function applyPhotoIntake(
  result: ClassificationResult,
  intake: PhotoIntake,
): ClassificationResult {
  const warnings = [...result.photoQuality.warnings];
  let lightingWarning = result.photoQuality.lightingWarning;
  let qualityBand = result.photoQuality.qualityBand;
  let confidence = result.confidence;

  if (intake.artificialLight) {
    lightingWarning = true;
    warnings.push(
      "Luz artificial declarada — o subtom pode parecer mais quente do que é.",
    );
    if (qualityBand === "boa") qualityBand = "aceitavel";
    confidence = Math.min(confidence, 0.62);
  }
  if (intake.makeupOnPhoto) {
    warnings.push(
      "Maquiagem na foto — as bochechas podem não mostrar o subtom da pele.",
    );
    confidence = Math.min(confidence, 0.64);
  }
  if (intake.dyedHair) {
    warnings.push(
      "Cabelo tingido — contraste e valor usam a cor atual do fio, não a raiz.",
    );
  }

  const photoQuality: PhotoQuality = {
    ...result.photoQuality,
    lightingWarning,
    qualityBand,
    warnings,
    intake,
  };

  const needsReview =
    result.needsReview ||
    intake.artificialLight ||
    intake.makeupOnPhoto ||
    shouldNeedsReview({
      confidence,
      temperatureScore: result.features.temperatureScore,
      faceLikeDetected: photoQuality.faceLikeDetected,
      lightingWarning,
      usedFaceFallback: photoQuality.usedFaceFallback,
      roiConsistencyWarning: photoQuality.roiConsistencyWarning,
      qualityBand,
    });

  return { ...result, confidence, needsReview, photoQuality };
}
