import { describe, expect, it } from "vitest";
import {
  calibrateRulesConfidence,
  calibrateConfidenceByAxis,
  formatConfidence,
  shouldNeedsReview,
} from "@/lib/color/confidence";

describe("calibrateRulesConfidence", () => {
  it("nunca passa de 85%", () => {
    const c = calibrateRulesConfidence({
      temperatureScore: 20,
      sampleCount: 5000,
      skinPixelRatio: 0.5,
      detectorProvider: "blazeface",
      hasReliableFace: true,
    });
    expect(c).toBeLessThanOrEqual(0.85);
  });

  it("penaliza heuristic e subtom ambíguo", () => {
    const strong = calibrateRulesConfidence({
      temperatureScore: 12,
      sampleCount: 1000,
      skinPixelRatio: 0.12,
      detectorProvider: "blazeface",
      hasReliableFace: true,
    });
    const weak = calibrateRulesConfidence({
      temperatureScore: 1,
      sampleCount: 1000,
      skinPixelRatio: 0.12,
      detectorProvider: "heuristic",
      hasReliableFace: true,
    });
    expect(weak).toBeLessThan(strong);
  });
});

describe("calibrateConfidenceByAxis", () => {
  it("retorna confiança alta em temperatura quando |tempScore| alto e sem ambiguidade", () => {
    const breakdown = calibrateConfidenceByAxis({
      temperatureScore: 14,
      sampleCount: 1200,
      skinPixelRatio: 0.15,
      detectorProvider: "blazeface",
      hasReliableFace: true,
      hasHairSample: true,
      contrastScore: 30,
      contrastSource: "skin_hair",
    });
    expect(breakdown.byAxis.temperature).toBeGreaterThan(0.8);
    expect(breakdown.overall).toBeGreaterThan(0.6);
  });

  it("penaliza temperatura quando ambígua (|temp| <3)", () => {
    const breakdown = calibrateConfidenceByAxis({
      temperatureScore: 2,
      sampleCount: 1000,
      skinPixelRatio: 0.12,
      detectorProvider: "blazeface",
      hasReliableFace: true,
    });
    expect(breakdown.byAxis.temperature).toBeLessThan(0.5);
  });

  it("confiança de valor depende de cabelo amostrado", () => {
    const withHair = calibrateConfidenceByAxis({
      temperatureScore: 10,
      sampleCount: 1000,
      skinPixelRatio: 0.12,
      detectorProvider: "blazeface",
      hasReliableFace: true,
      hasHairSample: true,
      contrastScore: 30,
      contrastSource: "skin_hair",
    });
    const withoutHair = calibrateConfidenceByAxis({
      temperatureScore: 10,
      sampleCount: 1000,
      skinPixelRatio: 0.12,
      detectorProvider: "blazeface",
      hasReliableFace: true,
      hasHairSample: false,
      contrastScore: 10,
      contrastSource: "skin_l",
    });
    expect(withHair.byAxis.value).toBeGreaterThan(withoutHair.byAxis.value);
  });

  it("confiança de contraste é maior quando fonte é skin_hair ou skin_eyes", () => {
    const goodSource = calibrateConfidenceByAxis({
      temperatureScore: 10,
      sampleCount: 1000,
      skinPixelRatio: 0.12,
      detectorProvider: "blazeface",
      hasReliableFace: true,
      hasHairSample: true,
      contrastScore: 35,
      contrastSource: "skin_hair",
    });
    const poorSource = calibrateConfidenceByAxis({
      temperatureScore: 10,
      sampleCount: 1000,
      skinPixelRatio: 0.12,
      detectorProvider: "blazeface",
      hasReliableFace: true,
      contrastScore: 15,
      contrastSource: "skin_l",
    });
    expect(goodSource.byAxis.contrast).toBeGreaterThan(poorSource.byAxis.contrast);
  });

  it("overall é cap em 85% (alinhado com calibrateRulesConfidence)", () => {
    const breakdown = calibrateConfidenceByAxis({
      temperatureScore: 20,
      sampleCount: 2000,
      skinPixelRatio: 0.25,
      detectorProvider: "blazeface",
      hasReliableFace: true,
      hasHairSample: true,
      contrastScore: 40,
      contrastSource: "skin_hair",
    });
    expect(breakdown.overall).toBeLessThanOrEqual(0.85);
  });
});

describe("shouldNeedsReview", () => {
  it("exige revisão com confiança baixa ou subtom ambíguo", () => {
    expect(
      shouldNeedsReview({
        confidence: 0.4,
        temperatureScore: 10,
        faceLikeDetected: true,
        lightingWarning: false,
        usedFaceFallback: false,
      }),
    ).toBe(true);
    expect(
      shouldNeedsReview({
        confidence: 0.8,
        temperatureScore: 1,
        faceLikeDetected: true,
        lightingWarning: false,
        usedFaceFallback: false,
      }),
    ).toBe(true);
  });
});

describe("formatConfidence", () => {
  it("rotula faixas", () => {
    expect(formatConfidence(0.4).band).toBe("baixa");
    expect(formatConfidence(0.65).band).toBe("moderada");
    expect(formatConfidence(0.8).band).toBe("alta");
  });

  it("nunca mostra 100% na UI", () => {
    expect(formatConfidence(1).percent).toBe(85);
    expect(formatConfidence(0.99).percent).toBe(85);
  });
});
