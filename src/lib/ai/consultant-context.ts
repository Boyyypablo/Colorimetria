import type { KnowledgeCard } from "@/lib/knowledge/types";
import type { EvaluationOpinion } from "@/lib/knowledge/types";

export function formatCardsForPrompt(cards: KnowledgeCard[]): string {
  if (cards.length === 0) return "(sem cards)";
  return cards
    .map((c) => {
      const doLine = c.do.map((d) => `- ${d}`).join("\n");
      const dontLine = c.dont.map((d) => `- ${d}`).join("\n");
      return `### ${c.id} — ${c.title}\n${c.body}\nFazer:\n${doLine}\nEvitar:\n${dontLine}`;
    })
    .join("\n\n");
}

export function formatRubricForPrompt(opinion: EvaluationOpinion): string {
  const axes = opinion.axes;
  const checks = opinion.checks
    .map((c) => `- [${c.pass ? "ok" : "revisar"}] ${c.label}: ${c.note}`)
    .join("\n");
  return [
    `Rubrica ${opinion.rubricVersion}`,
    `Eixos: temp=${axes.temperature} (score ${axes.temperatureScore.toFixed(1)}${axes.tempNudged ? ", nudge luz/cabelo" : ""}${axes.temperatureAmbiguous ? ", ambígua" : ""}), valor=${axes.value}, croma=${axes.chroma}, contraste=${axes.contrast}`,
    `needsReview rubrica: ${opinion.needsReview}`,
    checks,
  ].join("\n");
}

export const CONSULTANT_JSON_SCHEMA_HINT = `{
  "assessment": "string (até 800 chars, PT-BR)",
  "priorities": [{ "trait": "string", "action": "suavizar"|"exaltar"|"manter", "why": "string", "confidence": 0-1 }],
  "changes": [{ "id": "slug", "area": "olhar"|"olheiras"|"sobrancelha"|"labios"|"pele"|"cabelo"|"roupa"|"batom"|"sombra"|"base"|"acessorio"|"outro", "suggestion": "string", "colors": ["#RRGGBB"], "do": "string", "dont": "string" }],
  "seasonAlignment": "string — confirme a estação medida, não proponha outra",
  "needsHumanReview": boolean
}
priorities: 1 a 6 itens; changes: 1 a 8 itens; colors hex de 6 dígitos.`;
