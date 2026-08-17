import { describe, expect, it } from "vitest";
import { evaluateWithRubric } from "@/lib/knowledge/evaluate";
import { decideAnalysisStatus, presentEvaluation } from "@/lib/knowledge/explain";
import type { ColorFeatures, PhotoQuality } from "@/lib/color/types";

function features(): ColorFeatures {
  return {
    featureSchemaVersion: 1,
    lab: { L: 68, a: 14, b: 18 },
    labUndertone: { L: 68, a: 14, b: 18 },
    labHair: { L: 22, a: 4, b: 2 },
    labEyes: { L: 30, a: 4, b: 2 },
    temperatureScore: 12,
    valueScore: 68,
    chromaScore: 22,
    contrastScore: 47,
    contrastSource: "skin_hair",
    skinPixelRatio: 0.15,
    sampleCount: 1200,
    detectorProvider: "heuristic",
    faceBox: { x: 0.2, y: 0.15, width: 0.5, height: 0.55, score: 0.9 },
    roiLabs: [],
  };
}

const photo: PhotoQuality = {
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
};

describe("decideAnalysisStatus", () => {
  it("READY só se nada pediu revisão", () => {
    expect(
      decideAnalysisStatus({
        classifierNeedsReview: false,
        rubricNeedsReview: false,
        planNeedsHumanReview: false,
        consultantError: false,
      }),
    ).toBe("READY");
  });

  it("NEEDS_REVIEW quando a rubrica pede", () => {
    expect(
      decideAnalysisStatus({
        classifierNeedsReview: false,
        rubricNeedsReview: true,
        planNeedsHumanReview: false,
        consultantError: false,
      }),
    ).toBe("NEEDS_REVIEW");
  });
});

describe("presentEvaluation", () => {
  it("explica Inverno Brilhante com contraste, irmã e nudge", () => {
    const opinion = evaluateWithRubric({
      features: features(),
      photoQuality: photo,
      seasonId: "bright_winter",
      goals: ["harmonia"],
    });
    const view = presentEvaluation(opinion, "Inverno Brilhante", "bright_winter");
    expect(view.why).toMatch(/Inverno Brilhante/i);
    expect(view.why).toMatch(/Primavera Brilhante/i);
    expect(view.why).toMatch(/luz|cabelo/i);
    expect(view.axes.map((a) => a.id)).toEqual([
      "temperature",
      "value",
      "chroma",
      "contrast",
    ]);
    expect(view.axes.find((a) => a.id === "temperature")?.value).toBe("frio");
    expect(view.axes.find((a) => a.id === "contrast")?.value).toBe("alto");
    expect(view.checks.length).toBeGreaterThan(0);
    expect(view.checks.every((c) => "pass" in c && "note" in c)).toBe(true);
  });
});
