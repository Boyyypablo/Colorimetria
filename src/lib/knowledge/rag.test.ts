import { describe, expect, it } from "vitest";
import { cardEmbedText, cosineSimilarity } from "@/lib/knowledge/rag";
import { getCardById } from "@/lib/knowledge/retrieve";

describe("cosineSimilarity", () => {
  it("é 1 para vetores iguais", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("é 0 para ortogonais", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("é 0 se tamanho diferir", () => {
    expect(cosineSimilarity([1, 0], [1])).toBe(0);
  });
});

describe("cardEmbedText", () => {
  it("inclui título e corpo do card", () => {
    const card = getCardById("llm-does-not-classify");
    expect(card).toBeTruthy();
    const text = cardEmbedText(card!);
    expect(text).toMatch(/Linguagem/i);
    expect(text).toMatch(/estação/i);
  });
});
