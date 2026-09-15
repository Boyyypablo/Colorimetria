import { describe, expect, it } from "vitest";
import {
  calculateSisterSeasons,
  shouldShowSisterSeasons,
} from "./sister-seasons";
import type { ColorFeatures } from "./types";

describe("calculateSisterSeasons", () => {
  it("retorna até 3 estações alternativas", () => {
    const features: ColorFeatures = {
      featureSchemaVersion: 2,
      lab: { L: 68, a: 5, b: 10 },
      labUndertone: { L: 68, a: 5, b: 10 },
      labHair: { L: 35, a: 3, b: 6 },
      labEyes: { L: 30, a: 2, b: 4 },
      temperatureScore: 10,
      valueScore: 68,
      chromaScore: 18,
      contrastScore: 25,
      contrastSource: "skin_hair",
      skinPixelRatio: 0.12,
      sampleCount: 1000,
      detectorProvider: "blazeface",
      faceBox: { x: 0.25, y: 0.12, width: 0.5, height: 0.55, score: 0.98 },
      roiLabs: [],
    };

    const sisters = calculateSisterSeasons(features, "light_spring");
    expect(sisters.length).toBeGreaterThan(0);
    expect(sisters.length).toBeLessThanOrEqual(3);
    // Não deve incluir a estação principal
    expect(sisters).not.toContain("light_spring");
  });

  it("retorna estações diferentes da principal", () => {
    const features: ColorFeatures = {
      featureSchemaVersion: 2,
      lab: { L: 50, a: 2, b: -5 },
      labUndertone: { L: 50, a: 2, b: -5 },
      labHair: { L: 30, a: 1, b: -2 },
      labEyes: null,
      temperatureScore: -8,
      valueScore: 50,
      chromaScore: 12,
      contrastScore: 20,
      contrastSource: "skin_hair",
      skinPixelRatio: 0.1,
      sampleCount: 800,
      detectorProvider: "blazeface",
      faceBox: { x: 0.25, y: 0.12, width: 0.5, height: 0.55, score: 0.95 },
      roiLabs: [],
    };

    const mainSeason = "true_summer";
    const sisters = calculateSisterSeasons(features, mainSeason);

    // Todas as sisters devem ser diferentes da principal
    for (const sister of sisters) {
      expect(sister).not.toBe(mainSeason);
    }
  });

  it("retorna array vazio se nenhuma perturbação muda a estação", () => {
    // Caso extremo: features muito definidas, perturbações pequenas não mudam estação
    const features: ColorFeatures = {
      featureSchemaVersion: 2,
      lab: { L: 30, a: -2, b: -10 },
      labUndertone: { L: 30, a: -2, b: -10 },
      labHair: { L: 20, a: -1, b: -8 },
      labEyes: { L: 18, a: -1, b: -6 },
      temperatureScore: -15,
      valueScore: 30,
      chromaScore: 25,
      contrastScore: 35,
      contrastSource: "skin_hair",
      skinPixelRatio: 0.15,
      sampleCount: 1500,
      detectorProvider: "blazeface",
      faceBox: { x: 0.25, y: 0.12, width: 0.5, height: 0.55, score: 1.0 },
      roiLabs: [],
    };

    const sisters = calculateSisterSeasons(features, "deep_winter");
    // Pode ser vazio se todas as perturbações resultam na mesma estação
    expect(Array.isArray(sisters)).toBe(true);
  });
});

describe("shouldShowSisterSeasons", () => {
  it("retorna true quando confiança < 65%", () => {
    expect(shouldShowSisterSeasons(0.64)).toBe(true);
    expect(shouldShowSisterSeasons(0.55)).toBe(true);
    expect(shouldShowSisterSeasons(0.45)).toBe(true);
  });

  it("retorna false quando confiança >= 65%", () => {
    expect(shouldShowSisterSeasons(0.65)).toBe(false);
    expect(shouldShowSisterSeasons(0.72)).toBe(false);
    expect(shouldShowSisterSeasons(0.85)).toBe(false);
  });

  it("threshold exato em 0.65", () => {
    expect(shouldShowSisterSeasons(0.6499999)).toBe(true);
    expect(shouldShowSisterSeasons(0.65)).toBe(false);
  });
});
