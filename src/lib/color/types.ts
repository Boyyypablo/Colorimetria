export type Temperature = "warm" | "cool";
export type ValueLevel = "light" | "medium" | "deep";
export type ChromaLevel = "bright" | "soft" | "muted";

export type ColorSwatch = {
  hex: string;
  label: string;
  context?: Array<"trabalho" | "casual" | "noite">;
  /** Preenchido após ranking personalizado (Plano B). */
  score?: number;
  why?: string;
};

export type SeasonDefinition = {
  id: string;
  namePt: string;
  nameEn: string;
  temperature: Temperature;
  value: ValueLevel;
  chroma: ChromaLevel;
  description: string;
  useColors: string[];
  avoidColors: string[];
  clothing: ColorSwatch[];
  lipstick: ColorSwatch[];
  eyeshadow: ColorSwatch[];
  base: ColorSwatch[];
};

export type LabColor = {
  L: number;
  a: number;
  b: number;
};

export type FaceRoiLab = {
  kind: string;
  lab: LabColor;
  sampleCount: number;
};

export type ColorFeatures = {
  /** Schema version — bump when fields change for ML training. */
  featureSchemaVersion: 1 | 2;
  lab: LabColor;
  /** Lab agregado priorizando bochechas (subtom). */
  labUndertone: LabColor;
  /** Lab do cabelo (se amostrado). */
  labHair: LabColor | null;
  /** Lab aproximado da região dos olhos (se amostrado). */
  labEyes: LabColor | null;
  temperatureScore: number;
  valueScore: number;
  chromaScore: number;
  contrastScore: number;
  /** Como o contraste foi derivado. */
  contrastSource: "skin_l" | "skin_hair" | "skin_eyes";
  skinPixelRatio: number;
  sampleCount: number;
  detectorProvider: string;
  faceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    score: number;
  } | null;
  roiLabs: FaceRoiLab[];
};

export type PhotoQuality = {
  width: number;
  height: number;
  faceLikeDetected: boolean;
  faceDetected: boolean;
  detectorProvider: string;
  usedFaceFallback: boolean;
  lightingWarning: boolean;
  /** Consistência entre ROIs (testa vs bochecha). */
  roiConsistencyWarning: boolean;
  /** boa | aceitavel | ruim */
  qualityBand: "boa" | "aceitavel" | "ruim";
  warnings: string[];
  /** Dicas do checklist que falharam na análise automática. */
  failedTips: string[];
  /** Autodeclaração no upload — enviesa Lab se verdadeira. */
  intake?: {
    makeupOnPhoto: boolean;
    dyedHair: boolean;
    artificialLight: boolean;
  };
};

export type ClassificationResult = {
  seasonId: string;
  confidence: number;
  undertoneLabel: string;
  features: ColorFeatures;
  photoQuality: PhotoQuality;
  needsReview: boolean;
  predictorId: string;
};
