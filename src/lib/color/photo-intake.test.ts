import { describe, expect, it } from "vitest";
import { applyPhotoIntake, parsePhotoIntake } from "@/lib/color/photo-intake";
import type { ClassificationResult } from "@/lib/color/types";

function result(over: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    seasonId: "bright_winter",
    confidence: 0.8,
    undertoneLabel: "frio",
    needsReview: false,
    predictorId: "rules",
    features: {
      featureSchemaVersion: 2,
      lab: { L: 48, a: 8, b: -6 },
      labUndertone: { L: 48, a: 8, b: -6 },
      labHair: { L: 22, a: 4, b: 2 },
      labEyes: { L: 30, a: 4, b: 2 },
      temperatureScore: -10,
      valueScore: 48,
      chromaScore: 18,
      contrastScore: 34,
      contrastSource: "skin_hair",
      skinPixelRatio: 0.12,
      sampleCount: 900,
      detectorProvider: "heuristic",
      faceBox: { x: 0.2, y: 0.15, width: 0.5, height: 0.55, score: 0.9 },
      roiLabs: [],
    },
    photoQuality: {
      width: 1200,
      height: 1600,
      faceLikeDetected: true,
      faceDetected: true,
      detectorProvider: "heuristic",
      usedFaceFallback: false,
      lightingWarning: false,
      roiConsistencyWarning: false,
      qualityBand: "boa",
      warnings: [],
      failedTips: [],
    },
    ...over,
  };
}

describe("parsePhotoIntake", () => {
  it("lê os três toggles do FormData", () => {
    const fd = new FormData();
    fd.set("makeupOnPhoto", "true");
    fd.set("dyedHair", "false");
    fd.set("artificialLight", "true");
    expect(parsePhotoIntake(fd)).toEqual({
      makeupOnPhoto: true,
      dyedHair: false,
      artificialLight: true,
    });
  });
});

describe("applyPhotoIntake", () => {
  it("luz artificial força revisão e baixa confiança", () => {
    const out = applyPhotoIntake(result(), {
      makeupOnPhoto: false,
      dyedHair: false,
      artificialLight: true,
    });
    expect(out.needsReview).toBe(true);
    expect(out.confidence).toBeLessThanOrEqual(0.62);
    expect(out.photoQuality.lightingWarning).toBe(true);
    expect(out.photoQuality.qualityBand).toBe("aceitavel");
    expect(out.photoQuality.intake?.artificialLight).toBe(true);
  });

  it("maquiagem na foto não fecha READY", () => {
    const out = applyPhotoIntake(result(), {
      makeupOnPhoto: true,
      dyedHair: false,
      artificialLight: false,
    });
    expect(out.needsReview).toBe(true);
    expect(out.photoQuality.warnings.join(" ")).toMatch(/Maquiagem/i);
  });
});
