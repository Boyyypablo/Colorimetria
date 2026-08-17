import type { AnalysisGoalId } from "@/lib/color/goals";
import type { ChromaLevel, Temperature, ValueLevel } from "@/lib/color/types";

export const KNOWLEDGE_AXES = [
  "temperature",
  "value",
  "chroma",
  "contrast",
  "visagismo",
  "photo_quality",
  "harmony",
  "hair",
] as const;

export type KnowledgeAxis = (typeof KNOWLEDGE_AXES)[number];

export type ContrastBand = "low" | "medium" | "high";

export type KnowledgeSourceKind = "academy-module" | "internal-extract" | "product";

export type KnowledgeCard = {
  id: string;
  title: string;
  axes: KnowledgeAxis[];
  /** Vazio = vale para qualquer estação. */
  seasonIds: string[];
  goals: AnalysisGoalId[];
  body: string;
  do: string[];
  dont: string[];
  sources: Array<{ kind: KnowledgeSourceKind; ref: string }>;
};

export type RubricCheckId =
  | "photo_usable"
  | "face_evidence"
  | "temperature_evidence"
  | "value_with_hair"
  | "contrast_sampled"
  | "season_plus_sister"
  | "goals_only";

export type RubricCheck = {
  id: RubricCheckId;
  axis: KnowledgeAxis;
  label: string;
  how: string;
};

export type EvaluationCheckResult = {
  id: RubricCheckId;
  label: string;
  pass: boolean;
  note: string;
};

export type EvaluationAxes = {
  temperature: Temperature;
  temperatureScore: number;
  temperatureAmbiguous: boolean;
  tempNudged: boolean;
  value: ValueLevel;
  chroma: ChromaLevel;
  contrast: ContrastBand;
};

export type EvaluationOpinion = {
  rubricVersion: string;
  axes: EvaluationAxes;
  checks: EvaluationCheckResult[];
  needsReview: boolean;
  reviewReasons: string[];
  cardIds: string[];
};
