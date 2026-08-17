import { afterEach, describe, expect, it } from "vitest";
import {
  ollamaChatModel,
  resolveConsultantAiProvider,
} from "@/lib/ai/consultant-provider";

const KEYS = [
  "CONSULTANT_AI",
  "OLLAMA_MODEL",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "AI_GATEWAY_API_KEY",
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
    expect(resolveConsultantAiProvider()).toBe("ollama");
    expect(ollamaChatModel()).toBe("qwen2.5:7b");
  });

  it("cai em gemini se houver chave e CONSULTANT_AI vazio", () => {
    delete process.env.CONSULTANT_AI;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    expect(resolveConsultantAiProvider()).toBe("gemini");
  });

  it("cai em none sem chave e sem CONSULTANT_AI", () => {
    delete process.env.CONSULTANT_AI;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    expect(resolveConsultantAiProvider()).toBe("none");
  });
});
