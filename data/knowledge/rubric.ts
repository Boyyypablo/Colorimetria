import type { RubricCheck } from "@/lib/knowledge/types";

/** Versão da metodologia — bump se mudar checklist ou limiares. */
export const RUBRIC_VERSION = "1.0.0";

/**
 * Como avaliar uma análise. Limiares alinhados a `resolveSeasonAxes` /
 * `rules.ts` — a rubrica descreve o julgamento; a medição continua no preditor.
 */
export const RUBRIC_CHECKS: RubricCheck[] = [
  {
    id: "photo_usable",
    axis: "photo_quality",
    label: "Foto utilizável",
    how: "Luz frontal, sem filtro extremo, rosto visível. qualityBand ruim ou lightingWarning → revisão, não chute.",
  },
  {
    id: "face_evidence",
    axis: "photo_quality",
    label: "Evidência de rosto",
    how: "Rosto detectado sem fallback cego. Sem face → NEEDS_REVIEW.",
  },
  {
    id: "temperature_evidence",
    axis: "temperature",
    label: "Temperatura com evidência",
    how: "Subtom nas bochechas. |temperatureScore| < 3 é ambíguo. Luz quente + cabelo frio/escuro pode ter nudge — não tratar como certeza.",
  },
  {
    id: "value_with_hair",
    axis: "value",
    label: "Valor considera cabelo",
    how: "Pele clara + cabelo escuro não é estação clara. Sem amostra de cabelo e contraste alto → revisar profundidade.",
  },
  {
    id: "contrast_sampled",
    axis: "contrast",
    label: "Contraste pele × cabelo × olhos",
    how: "Contraste alto/médio/baixo guia make, óculos e mechas. Preferir labHair e labEyes além do L da pele.",
  },
  {
    id: "season_plus_sister",
    axis: "harmony",
    label: "Estação + cartela irmã",
    how: "Entregar a cartela medida e citar a irmã (mesma família, temperatura oposta). Irmã não substitui a paleta.",
  },
  {
    id: "goals_only",
    axis: "harmony",
    label: "Coaching só do que foi pedido",
    how: "Objetivo cabelo → notas capilares. Make → blush/batom/contorno. Visagismo (formato) não troca a cartela.",
  },
];

export const TEMPERATURE_AMBIGUOUS_ABS = 3;
