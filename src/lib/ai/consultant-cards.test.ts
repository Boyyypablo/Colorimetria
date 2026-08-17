import { describe, expect, it } from "vitest";
import { buildConsultantPlanFromCards } from "@/lib/ai/consultant-cards";
import { evaluateWithRubric } from "@/lib/knowledge/evaluate";
import type { ColorFeatures, PhotoQuality } from "@/lib/color/types";
import { getCardById } from "@/lib/knowledge/retrieve";

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

describe("buildConsultantPlanFromCards", () => {
  it("monta plano válido só com rubrica e cards", () => {
    const opinion = evaluateWithRubric({
      features: features(),
      photoQuality: photo,
      seasonId: "bright_winter",
      goals: ["harmonia", "roupas"],
    });
    const cards = opinion.cardIds
      .map((id) => getCardById(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    const plan = buildConsultantPlanFromCards({
      intention: "Valorizar o olhar e acertar blusas perto do rosto",
      goals: ["harmonia", "roupas"],
      seasonId: "bright_winter",
      seasonName: "Inverno Brilhante",
      undertoneLabel: "frio",
      cards,
      opinion,
    });

    expect(plan.priorities.length).toBeGreaterThan(0);
    expect(plan.changes.length).toBeGreaterThan(0);
    expect(plan.seasonAlignment).toMatch(/Inverno Brilhante/);
    expect(plan.assessment).toMatch(/intenção/i);
  });
});
