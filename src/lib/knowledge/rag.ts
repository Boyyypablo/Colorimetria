import { KNOWLEDGE_CARDS } from "../../../data/knowledge/cards";
import { ollamaEmbed } from "@/lib/ai/ollama";
import type { KnowledgeCard } from "@/lib/knowledge/types";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function cardEmbedText(card: KnowledgeCard): string {
  return [
    card.title,
    card.body,
    `Fazer: ${card.do.join(" ")}`,
    `Evitar: ${card.dont.join(" ")}`,
  ].join("\n");
}

type CardVec = { card: KnowledgeCard; vec: number[] };

let cache: Promise<CardVec[]> | null = null;

export function resetKnowledgeEmbedCache(): void {
  cache = null;
}

async function allCardVectors(): Promise<CardVec[]> {
  if (!cache) {
    cache = (async () => {
      const texts = KNOWLEDGE_CARDS.map(cardEmbedText);
      const embeddings = await ollamaEmbed(texts);
      return KNOWLEDGE_CARDS.map((card, i) => ({ card, vec: embeddings[i] }));
    })();
  }
  try {
    return await cache;
  } catch (err) {
    cache = null;
    throw err;
  }
}

/** Reordena cards candidatos por similaridade ao texto da consulta. */
export async function rerankCardsByQuery(
  query: string,
  candidates: KnowledgeCard[],
  limit: number,
): Promise<KnowledgeCard[]> {
  if (candidates.length <= 1 || !query.trim()) {
    return candidates.slice(0, limit);
  }
  try {
    const [qVec] = await ollamaEmbed([query.trim()]);
    const index = await allCardVectors();
    const byId = new Map(index.map((x) => [x.card.id, x.vec]));
    const scored = candidates.map((card) => {
      const vec = byId.get(card.id);
      return { card, score: vec ? cosineSimilarity(qVec, vec) : 0 };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.card);
  } catch {
    return candidates.slice(0, limit);
  }
}
