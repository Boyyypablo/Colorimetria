import { afterEach, describe, expect, it } from "vitest";
import {
  consultantAllowsVision,
  ollamaChatModel,
  resolveConsultantAiProvider,
} from "@/lib/ai/consultant-provider";

const KEYS = [
  "CONSULTANT_AI",
  "CONSULTANT_VISION",
  "OLLAMA_MODEL",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "AI_GATEWAY_API_KEY",
  "VERCEL",
] as const;

const snapshot = Object.fromEntries(
  KEYS.map((k) => [k, process.env[k]]),
) as Record<string, string | undefined>;

afterEach(() => {
  for (const k of KEYS) {
    const v = snapshot[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("resolveConsultantAiProvider", () => {
  it("respeita none", () => {
    process.env.CONSULTANT_AI = "none";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    expect(resolveConsultantAiProvider()).toBe("none");
  });

  it("respeita ollama mesmo com chave Gemini", () => {
    process.env.CONSULTANT_AI = "ollama";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    delete process.env.VERCEL;
    expect(resolveConsultantAiProvider()).toBe("ollama");
    expect(ollamaChatModel()).toBe("qwen2.5:7b");
  });

  it("na Vercel usa cards (sem Ollama e sem Gemini)", () => {
    process.env.CONSULTANT_AI = "ollama";
    process.env.VERCEL = "1";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    expect(resolveConsultantAiProvider()).toBe("cards");
  });

  it("sem CONSULTANT_AI gera plano por cards", () => {
    delete process.env.CONSULTANT_AI;
    delete process.env.VERCEL;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    expect(resolveConsultantAiProvider()).toBe("cards");
  });

  it("gemini só se for pedido e houver chave", () => {
    process.env.CONSULTANT_AI = "gemini";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    expect(resolveConsultantAiProvider()).toBe("gemini");
  });

  it("não envia selfie ao Gemini na Vercel sem CONSULTANT_VISION", () => {
    process.env.VERCEL = "1";
    delete process.env.CONSULTANT_VISION;
    expect(consultantAllowsVision()).toBe(false);
    process.env.CONSULTANT_VISION = "true";
    expect(consultantAllowsVision()).toBe(true);
  });
});
