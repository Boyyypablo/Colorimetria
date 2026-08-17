import { describe, expect, it } from "vitest";
import {
  formatCardsForPrompt,
  formatRubricForPrompt,
} from "@/lib/ai/consultant-context";
import { evaluateWithRubric } from "@/lib/knowledge/evaluate";
import { getCardById } from "@/lib/knowledge/retrieve";
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

describe("consultant context", () => {
  it("prompt de cards cita id e não inventa estação no texto do card llm", () => {
    const card = getCardById("llm-does-not-classify")!;
    const block = formatCardsForPrompt([card]);
    expect(block).toContain("llm-does-not-classify");
    expect(block).toMatch(/não inventa|não reabre|NÃO|não/i);
  });

  it("rubrica do caso Inverno Brilhante inclui nudge e irmã nos cards", () => {
    const opinion = evaluateWithRubric({
      features: features(),
      photoQuality: photo,
      seasonId: "bright_winter",
      goals: ["harmonia"],
    });
    const block = formatRubricForPrompt(opinion);
    expect(block).toMatch(/nudge|fria|cool/i);
    expect(opinion.cardIds).toContain("sister-palette");
    expect(opinion.cardIds).toContain("bright-winter");
    expect(opinion.axes.temperature).toBe("cool");
  });
});
