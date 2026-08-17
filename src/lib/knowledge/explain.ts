import { getSeasonById } from "@/lib/color/recommendations";
import { contrastBandLabel, SISTER_SEASONS } from "@/lib/color/season-knowledge";
import type { EvaluationOpinion } from "@/lib/knowledge/types";

const TEMP_PT = { warm: "quente", cool: "frio" } as const;
const VALUE_PT = {
  light: "claro",
  medium: "médio",
  deep: "profundo",
} as const;
const CHROMA_PT = {
  bright: "brilhante",
  soft: "suave",
  muted: "suave (baixa saturação)",
} as const;

export type EvaluationAxisView = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  uncertain?: boolean;
};

export type EvaluationCheckView = {
  id: string;
  label: string;
  pass: boolean;
  note: string;
};

export type EvaluationView = {
  rubricVersion: string;
  why: string;
  axes: EvaluationAxisView[];
  checks: EvaluationCheckView[];
  reviewReasons: string[];
  needsReview: boolean;
};

export function presentEvaluation(
  opinion: EvaluationOpinion,
  seasonName: string,
  seasonId: string,
): EvaluationView {
  const { axes } = opinion;
  const temp = TEMP_PT[axes.temperature];
  const value = VALUE_PT[axes.value];
  const chroma = CHROMA_PT[axes.chroma];
  const contrast = contrastBandLabel(axes.contrast);

  const parts = [
    `${seasonName} combina com subtom ${temp}, valor ${value}, croma ${chroma} e contraste ${contrast} entre pele, cabelo e olhos.`,
  ];
  if (axes.tempNudged) {
    parts.push(
      "A luz da foto aquecia a pele; o cabelo mais escuro/frio corrigiu a leitura de temperatura.",
    );
  }
  if (axes.temperatureAmbiguous) {
    parts.push("O subtom ficou próximo do neutro — a cartela usa também valor e contraste.");
  }
  const sisterId = SISTER_SEASONS[seasonId];
  const sisterName = sisterId ? getSeasonById(sisterId)?.namePt : undefined;
  if (sisterName) {
    parts.push(
      `Cartela irmã: ${sisterName} — mesma família, temperatura oposta. Não substitui a sua.`,
    );
  }

  return {
    rubricVersion: opinion.rubricVersion,
    why: parts.join(" "),
    axes: [
      {
        id: "temperature",
        label: "Temperatura",
        value: temp,
        uncertain: axes.temperatureAmbiguous,
        hint: axes.tempNudged
          ? "Ajustada com cabelo — a luz da foto aquecia a pele."
          : axes.temperatureAmbiguous
            ? "Subtom próximo do neutro."
            : undefined,
      },
      { id: "value", label: "Valor", value: value },
      { id: "chroma", label: "Croma", value: chroma },
      { id: "contrast", label: "Contraste", value: contrast },
    ],
    checks: opinion.checks.map((c) => ({
      id: c.id,
      label: c.label,
      pass: c.pass,
      note: c.note,
    })),
    reviewReasons: opinion.reviewReasons,
    needsReview: opinion.needsReview,
  };
}

export function decideAnalysisStatus(input: {
  classifierNeedsReview: boolean;
  rubricNeedsReview: boolean;
  planNeedsHumanReview: boolean;
  consultantError: boolean;
}): "NEEDS_REVIEW" | "READY" {
  if (
    input.classifierNeedsReview ||
    input.rubricNeedsReview ||
    input.planNeedsHumanReview ||
    input.consultantError
  ) {
    return "NEEDS_REVIEW";
  }
  return "READY";
}
