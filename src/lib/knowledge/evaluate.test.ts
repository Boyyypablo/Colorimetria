import { describe, expect, it } from "vitest";
import { KNOWLEDGE_CARDS } from "../../../data/knowledge/cards";
import { RUBRIC_CHECKS, RUBRIC_VERSION } from "../../../data/knowledge/rubric";
import { evaluateWithRubric } from "@/lib/knowledge/evaluate";
import { retrieveKnowledgeCards } from "@/lib/knowledge/retrieve";
import type { ColorFeatures, PhotoQuality } from "@/lib/color/types";

function features(over: Partial<ColorFeatures> = {}): ColorFeatures {
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
    ...over,
  };
}

const goodPhoto: PhotoQuality = {
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

describe("knowledge cards", () => {
  it("tem ids únicos e eixos preenchidos", () => {
    const ids = KNOWLEDGE_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(KNOWLEDGE_CARDS.length).toBeGreaterThanOrEqual(36);
    for (const card of KNOWLEDGE_CARDS) {
      expect(card.axes.length).toBeGreaterThan(0);
      expect(card.body.length).toBeGreaterThan(40);
    }
  });

  it("recupera card de Inverno Brilhante e irmã", () => {
    const cards = retrieveKnowledgeCards({
      axes: ["temperature", "value", "chroma", "contrast", "harmony", "hair"],
      seasonId: "bright_winter",
      goals: ["harmonia", "cabelo"],
      limit: 16,
    });
    const ids = cards.map((c) => c.id);
    expect(ids).toContain("bright-winter");
    expect(ids).toContain("hair-complements");
  });

  it("inclui destilação 07–08 e visagismo por contraste", () => {
    const ids = new Set(KNOWLEDGE_CARDS.map((c) => c.id));
    expect(ids.has("light-and-perception")).toBe(true);
    expect(ids.has("monochrome-family")).toBe(true);
    expect(ids.has("true-seasons-family")).toBe(true);
    expect(ids.has("features-not-defects")).toBe(true);
    const contour = KNOWLEDGE_CARDS.find((c) => c.id === "face-shapes-contour");
    expect(contour?.body.toLowerCase()).toContain("não classifica");
  });
});

describe("evaluateWithRubric", () => {
  it("expõe versão da rubrica e todos os checks", () => {
    const opinion = evaluateWithRubric({
      features: features(),
      photoQuality: goodPhoto,
      seasonId: "bright_winter",
      goals: ["harmonia"],
    });
    expect(opinion.rubricVersion).toBe(RUBRIC_VERSION);
    expect(opinion.checks).toHaveLength(RUBRIC_CHECKS.length);
    expect(opinion.axes.contrast).toBe("high");
    expect(opinion.axes.value).not.toBe("light");
    expect(opinion.cardIds.length).toBeGreaterThan(0);
  });

  it("maquiagem declarada falha photo_usable", () => {
    const opinion = evaluateWithRubric({
      features: features(),
      photoQuality: {
        ...goodPhoto,
        intake: { makeupOnPhoto: true, dyedHair: false, artificialLight: false },
      },
      seasonId: "bright_winter",
      goals: ["harmonia"],
    });
    const photo = opinion.checks.find((c) => c.id === "photo_usable");
    expect(photo?.pass).toBe(false);
    expect(opinion.needsReview).toBe(true);
  });

  it("caso Inverno Brilhante: luz quente na pele + cabelo escuro gera nudge", () => {
    const opinion = evaluateWithRubric({
      features: features({ temperatureScore: 12 }),
      photoQuality: goodPhoto,
      seasonId: "bright_winter",
    });
    expect(opinion.axes.tempNudged).toBe(true);
    expect(opinion.axes.temperature).toBe("cool");
    expect(opinion.cardIds).toContain("bright-winter");
    expect(opinion.cardIds).toContain("false-warm-light");
  });

  it("sem rosto pede revisão", () => {
    const opinion = evaluateWithRubric({
      features: features(),
      photoQuality: { ...goodPhoto, faceDetected: false },
      seasonId: "bright_winter",
    });
    expect(opinion.needsReview).toBe(true);
    expect(opinion.checks.find((c) => c.id === "face_evidence")?.pass).toBe(false);
  });

  it("contraste alto sem cabelo falha evidência de valor", () => {
    const opinion = evaluateWithRubric({
      features: features({ labHair: null, contrastSource: "skin_l" }),
      photoQuality: goodPhoto,
      seasonId: "bright_spring",
    });
    expect(opinion.checks.find((c) => c.id === "value_with_hair")?.pass).toBe(false);
    expect(opinion.needsReview).toBe(true);
  });

  it("objetivo cabelo traz cards de hair", () => {
    const opinion = evaluateWithRubric({
      features: features(),
      photoQuality: goodPhoto,
      seasonId: "bright_winter",
      goals: ["harmonia", "cabelo"],
    });
    expect(
      opinion.cardIds.some((id) => id === "hair-complements" || id === "hair-harmony-steps"),
    ).toBe(true);
  });

  it("objetivo maquiagem pinia visagismo e mapa de contraste", () => {
    const opinion = evaluateWithRubric({
      features: features(),
      photoQuality: goodPhoto,
      seasonId: "bright_winter",
      goals: ["maquiagem"],
    });
    expect(opinion.cardIds).toContain("visagismo-not-season");
    expect(opinion.cardIds).toContain("face-shapes-contour");
    expect(opinion.cardIds).toContain("features-not-defects");
  });
});
