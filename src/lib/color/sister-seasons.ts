import { pickSeason, resolveSeasonAxes } from "./predictor/rules";
import type { ColorFeatures } from "./types";

/**
 * P0.5: Calcula estações vizinhas por perturbação de features.
 * Usado quando confiança < 65% para mostrar alternativas.
 */
export function calculateSisterSeasons(
  features: ColorFeatures,
  mainSeasonId: string,
): string[] {
  const perturbations: Array<Partial<ColorFeatures>> = [
    // Perturbar temperatura
    { temperatureScore: features.temperatureScore + 5 },
    { temperatureScore: features.temperatureScore - 5 },
    // Perturbar valor
    { valueScore: features.valueScore + 5 },
    { valueScore: features.valueScore - 5 },
    // Perturbar croma
    { chromaScore: features.chromaScore + 3 },
    { chromaScore: features.chromaScore - 3 },
    // Perturbar contraste
    { contrastScore: features.contrastScore + 5 },
    { contrastScore: features.contrastScore - 5 },
  ];

  const alternatives = new Set<string>();

  for (const perturb of perturbations) {
    const testFeatures = { ...features, ...perturb };
    const axes = resolveSeasonAxes(testFeatures);
    const seasonId = pickSeason(axes);
    if (seasonId !== mainSeasonId) {
      alternatives.add(seasonId);
    }
  }

  // Retornar até 3 estações mais frequentes
  const counts = new Map<string, number>();
  for (const season of alternatives) {
    counts.set(season, (counts.get(season) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

/**
 * Retorna se a análise deve mostrar estações irmãs.
 */
export function shouldShowSisterSeasons(confidence: number): boolean {
  return confidence < 0.65;
}
