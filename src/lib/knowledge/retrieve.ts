import { KNOWLEDGE_CARDS } from "../../../data/knowledge/cards";
import type { AnalysisGoalId } from "@/lib/color/goals";
import { DEFAULT_ANALYSIS_GOALS, parseAnalysisGoals } from "@/lib/color/goals";
import type { KnowledgeAxis, KnowledgeCard } from "@/lib/knowledge/types";

const MAX_CARDS = 8;

export function getCardById(id: string): KnowledgeCard | undefined {
  return KNOWLEDGE_CARDS.find((c) => c.id === id);
}

export function retrieveKnowledgeCards(opts: {
  axes: KnowledgeAxis[];
  seasonId?: string;
  goals?: AnalysisGoalId[] | string[];
  limit?: number;
}): KnowledgeCard[] {
  const goals = parseAnalysisGoals(opts.goals ?? DEFAULT_ANALYSIS_GOALS);
  const axisSet = new Set(opts.axes);
  const scored = KNOWLEDGE_CARDS.map((card) => {
    const axisHit = card.axes.filter((a) => axisSet.has(a)).length;
    const seasonHit =
      card.seasonIds.length === 0 ||
      (opts.seasonId != null && card.seasonIds.includes(opts.seasonId));
    const goalHit = card.goals.some((g) => goals.includes(g));
    if (!seasonHit || axisHit === 0) return null;
    const score = axisHit * 3 + (goalHit ? 2 : 0) + (card.seasonIds.length > 0 ? 1 : 0);
    return { card, score };
  }).filter((x): x is { card: KnowledgeCard; score: number } => x != null);

  scored.sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id));
  const limit = opts.limit ?? MAX_CARDS;
  return scored.slice(0, limit).map((s) => s.card);
}
