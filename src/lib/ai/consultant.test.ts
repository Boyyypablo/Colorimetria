import { describe, expect, it } from "vitest";
import {
  consultantChangeTarget,
  consultantPlanSchema,
} from "./consultant-plan-schema";
import { parseConsultantPlan, shouldUseVision, generateConsultantPlan } from "./consultant";

describe("consultantPlanSchema", () => {
  it("aceita plano válido", () => {
    const plan = {
      assessment: "Intenção de valorizar o olhar com olheiras leves.",
      priorities: [
        {
          trait: "olhar",
          action: "exaltar",
          why: "Pedido explícito + contraste médio.",
          confidence: 0.8,
        },
      ],
      changes: [
        {
          id: "olhar-1",
          area: "sobrancelha",
          suggestion: "Definir sobrancelha no tom do cabelo.",
          colors: ["#3D2B1F"],
          do: "Traço fino e preenchimento suave.",
          dont: "Evitar preto absoluto perto dos olhos.",
        },
      ],
      seasonAlignment: "Alinha com Inverno Brilhante sem endurecer.",
      needsHumanReview: false,
    };
    expect(consultantPlanSchema.parse(plan).changes[0].id).toBe("olhar-1");
  });

  it("parseConsultantPlan rejeita lixo", () => {
    expect(parseConsultantPlan({ foo: 1 })).toBeNull();
  });

  it("consultantChangeTarget", () => {
    expect(consultantChangeTarget("olhar-1")).toBe("ai_change:olhar-1");
  });
});

describe("shouldUseVision", () => {
  it("liga com goals de pele", () => {
    expect(
      shouldUseVision({ intention: "quero cores", goals: ["olheiras"] }),
    ).toBe(true);
  });

  it("liga por palavra na intenção", () => {
    expect(
      shouldUseVision({
        intention: "quero exaltar o olhar e suavizar olheiras",
        goals: ["harmonia"],
      }),
    ).toBe(true);
  });

  it("fica off em intenção só de paleta", () => {
    expect(
      shouldUseVision({
        intention: "quero saber minha cartela de cores para roupas",
        goals: ["harmonia", "roupas"],
      }),
    ).toBe(false);
  });
});

describe("generateConsultantPlan", () => {
  it("pula intenção curta sem chamar modelo", async () => {
    const result = await generateConsultantPlan({
      intention: "oi",
      goals: ["harmonia"],
      context: "casual",
      seasonId: "bright_winter",
      seasonName: "Inverno Brilhante",
      undertoneLabel: "frio",
      confidence: 0.7,
      features: {
        featureSchemaVersion: 1,
        lab: { L: 50, a: 5, b: -4 },
        labUndertone: { L: 50, a: 5, b: -4 },
        labHair: null,
        labEyes: null,
        temperatureScore: -8,
        valueScore: 50,
        chromaScore: 20,
        contrastScore: 30,
        contrastSource: "skin_l",
        skinPixelRatio: 0.1,
        sampleCount: 100,
        detectorProvider: "heuristic",
        faceBox: null,
        roiLabs: [],
      },
      photoQuality: { faceDetected: true, qualityBand: "boa", warnings: [] },
    });
    expect(result.plan).toBeNull();
    expect(result.meta.status).toBe("skipped");
  });
});
