import sharp from "sharp";
import { chromaFromLab, median, rgbToLab } from "./cielab";
import { shouldNeedsReview } from "./confidence";
import { createColorPredictor } from "./predictor";
import type {
  ClassificationResult,
  ColorFeatures,
  FaceRoiLab,
  LabColor,
  PhotoQuality,
} from "./types";
import {
  boxToPixels,
  detectFaceWithFallback,
  type FaceRoi,
} from "@/lib/vision/face";
import {
  isEyePixel,
  isHairPixel,
  isSkinPixel,
} from "@/lib/vision/face/providers/heuristic";

type SampleMode = "skin" | "hair" | "eye";

function pixelFilter(mode: SampleMode) {
  if (mode === "hair") return isHairPixel;
  if (mode === "eye") return isEyePixel;
  return isSkinPixel;
}

function modeForRoi(kind: string): SampleMode {
  if (kind === "hair") return "hair";
  if (kind === "leftEye" || kind === "rightEye") return "eye";
  return "skin";
}

async function sampleRoiLabs(
  buffer: Buffer,
  width: number,
  height: number,
  rois: FaceRoi[],
): Promise<FaceRoiLab[]> {
  const results: FaceRoiLab[] = [];

  for (const roi of rois) {
    const px = boxToPixels(roi, width, height);
    if (px.width < 4 || px.height < 4) continue;
    const mode = modeForRoi(roi.kind);
    const accept = pixelFilter(mode);
    const minSamples = mode === "skin" ? 8 : 5;

    try {
      const { data, info } = await sharp(buffer)
        .rotate()
        .ensureAlpha()
        .extract(px)
        .resize({ width: 96, height: 96, fit: "inside" })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const labs: LabColor[] = [];
      const channels = info.channels;
      for (let i = 0; i < data.length; i += channels) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        if (!accept(r, g, b)) continue;
        labs.push(rgbToLab(r, g, b));
      }

      if (labs.length < minSamples) continue;
      results.push({
        kind: roi.kind,
        lab: {
          L: median(labs.map((l) => l.L)),
          a: median(labs.map((l) => l.a)),
          b: median(labs.map((l) => l.b)),
        },
        sampleCount: labs.length,
      });
    } catch {
      // ROI fora dos limites / extract falhou — ignora
    }
  }

  return results;
}

function undertoneLabFromRois(
  roiLabs: FaceRoiLab[],
  fallback: LabColor,
): LabColor {
  const cheeks = roiLabs.filter(
    (r) => r.kind === "leftCheek" || r.kind === "rightCheek",
  );
  if (cheeks.length === 0) return fallback;
  return {
    L: median(cheeks.map((c) => c.lab.L)),
    a: median(cheeks.map((c) => c.lab.a)),
    b: median(cheeks.map((c) => c.lab.b)),
  };
}

function medianLab(items: FaceRoiLab[]): LabColor | null {
  if (items.length === 0) return null;
  return {
    L: median(items.map((c) => c.lab.L)),
    a: median(items.map((c) => c.lab.a)),
    b: median(items.map((c) => c.lab.b)),
  };
}

function assessQualityBand(input: {
  lightingWarning: boolean;
  faceLikeDetected: boolean;
  usedFaceFallback: boolean;
  roiConsistencyWarning: boolean;
  resolutionLow: boolean;
  skinPixelRatio: number;
}): PhotoQuality["qualityBand"] {
  let score = 3;
  if (input.lightingWarning) score -= 1;
  if (!input.faceLikeDetected) score -= 2;
  if (input.usedFaceFallback) score -= 1;
  if (input.roiConsistencyWarning) score -= 1;
  if (input.resolutionLow) score -= 1;
  if (input.skinPixelRatio < 0.04) score -= 1;
  if (score >= 3) return "boa";
  if (score >= 1) return "aceitavel";
  return "ruim";
}

export async function analyzeImageBuffer(
  buffer: Buffer,
): Promise<ClassificationResult> {
  const image = sharp(buffer).rotate().ensureAlpha();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const warnings: string[] = [];
  const failedTips: string[] = [];
  const resolutionLow = width < 400 || height < 400;
  if (resolutionLow) {
    warnings.push("Resolução baixa — prefira fotos com pelo menos 800px.");
    failedTips.push("Foto com boa resolução (≥800px)");
  }

  const face = await detectFaceWithFallback(buffer, width, height);
  warnings.push(...face.warnings);

  const cropBox = face.primary ?? {
    x: 0.25,
    y: 0.12,
    width: 0.5,
    height: 0.55,
    score: 0,
  };
  const cropPx = boxToPixels(cropBox, width, height);

  const { data, info } = await sharp(buffer)
    .rotate()
    .ensureAlpha()
    .extract(cropPx)
    .resize({ width: 320, height: 320, fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const labs: LabColor[] = [];
  let skinCount = 0;
  const totalPixels = info.width * info.height;
  let luminanceSum = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    luminanceSum += 0.299 * r + 0.587 * g + 0.114 * b;
    if (!isSkinPixel(r, g, b)) continue;
    skinCount += 1;
    labs.push(rgbToLab(r, g, b));
  }

  const avgLuma = luminanceSum / Math.max(1, totalPixels);
  const lightingWarning = avgLuma < 60 || avgLuma > 210;
  if (lightingWarning) {
    warnings.push(
      "Iluminação possivelmente irregular — use luz natural frontal neutra.",
    );
    failedTips.push("Luz natural frontal (perto da janela, sem contraluz)");
  }

  const faceDetected = Boolean(face.faces.length > 0 && !face.usedFallback);
  const faceLikeDetected = faceDetected || skinCount >= 80;
  if (!faceLikeDetected) {
    warnings.push(
      "Rosto pouco visível — centralize o rosto, sem maquiagem pesada.",
    );
    failedTips.push("Rosto centralizado, sem filtro nem maquiagem pesada");
  }
  if (face.usedFallback) {
    failedTips.push("Enquadramento claro do rosto (selfie frontal)");
  }

  if (labs.length < 40) {
    for (let i = 0; i < data.length; i += channels * 8) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      labs.push(rgbToLab(r, g, b));
    }
  }

  const Lvals = labs.map((l) => l.L);
  const aVals = labs.map((l) => l.a);
  const bVals = labs.map((l) => l.b);
  const lab: LabColor = {
    L: median(Lvals),
    a: median(aVals),
    b: median(bVals),
  };

  const roiLabs = await sampleRoiLabs(buffer, width, height, face.rois);
  const labUndertone = undertoneLabFromRois(roiLabs, lab);
  const labHair = medianLab(roiLabs.filter((r) => r.kind === "hair"));
  const labEyes = medianLab(
    roiLabs.filter((r) => r.kind === "leftEye" || r.kind === "rightEye"),
  );

  const forehead = roiLabs.find((r) => r.kind === "forehead");
  const cheekL = labUndertone.L;
  let roiConsistencyWarning = false;
  if (forehead && Math.abs(forehead.lab.L - cheekL) > 14) {
    roiConsistencyWarning = true;
    warnings.push(
      "Luminosidade desigual entre testa e bochechas — luz lateral ou sombra pode distorcer o subtom.",
    );
    failedTips.push("Iluminação uniforme no rosto (sem sombra dura de um lado)");
  }

  const sortedL = [...Lvals].sort((a, b) => a - b);
  const p10 = sortedL[Math.floor(sortedL.length * 0.1)] ?? lab.L;
  const p90 = sortedL[Math.floor(sortedL.length * 0.9)] ?? lab.L;
  const skinContrast = p90 - p10;
  const hairContrast = labHair ? Math.abs(lab.L - labHair.L) : 0;
  const eyeContrast = labEyes ? Math.abs(lab.L - labEyes.L) : 0;

  let contrastScore = skinContrast;
  let contrastSource: ColorFeatures["contrastSource"] = "skin_l";
  if (hairContrast > contrastScore) {
    contrastScore = hairContrast;
    contrastSource = "skin_hair";
  }
  if (eyeContrast > contrastScore * 0.9 && eyeContrast > 10) {
    // olhos ajudam a confirmar contraste alto, sem substituir se cabelo já bastou
    if (eyeContrast > contrastScore) {
      contrastScore = eyeContrast;
      contrastSource = "skin_eyes";
    }
  }

  const skinPixelRatio = skinCount / Math.max(1, totalPixels);
  const qualityBand = assessQualityBand({
    lightingWarning,
    faceLikeDetected,
    usedFaceFallback: face.usedFallback,
    roiConsistencyWarning,
    resolutionLow,
    skinPixelRatio,
  });
  if (qualityBand === "ruim") {
    warnings.push(
      "Qualidade da foto baixa para colorimetria confiável — refaça com luz natural e enquadramento frontal.",
    );
  }

  const features: ColorFeatures = {
    featureSchemaVersion: 2,
    lab,
    labUndertone,
    labHair,
    labEyes,
    temperatureScore: Number(
      (labUndertone.b * 0.7 + labUndertone.a * 0.3).toFixed(2),
    ),
    valueScore: Number(lab.L.toFixed(2)),
    chromaScore: Number(chromaFromLab(labUndertone).toFixed(2)),
    contrastScore: Number(contrastScore.toFixed(2)),
    contrastSource,
    skinPixelRatio: Number(skinPixelRatio.toFixed(4)),
    sampleCount: labs.length,
    detectorProvider: face.provider,
    faceBox: face.primary,
    roiLabs,
  };

  const predictor = createColorPredictor();
  const { seasonId, undertoneLabel, confidence, confidenceBreakdown } = predictor.predict(features);
  const needsReview = shouldNeedsReview({
    confidence,
    temperatureScore: features.temperatureScore,
    faceLikeDetected,
    lightingWarning,
    usedFaceFallback: face.usedFallback,
    roiConsistencyWarning,
    qualityBand,
  });

  const photoQuality: PhotoQuality = {
    width,
    height,
    faceLikeDetected,
    faceDetected,
    detectorProvider: face.provider,
    usedFaceFallback: face.usedFallback,
    lightingWarning,
    roiConsistencyWarning,
    qualityBand,
    warnings: [...new Set(warnings)],
    failedTips: [...new Set(failedTips)],
  };

  return {
    seasonId,
    confidence,
    undertoneLabel,
    features,
    photoQuality,
    needsReview,
    predictorId: predictor.id,
    confidenceBreakdown,
  };
}

/** Classifica a partir de um Lab já conhecido (testes / fixtures). */
export function classifyFromLab(
  lab: LabColor,
  extras?: Partial<ColorFeatures> & { width?: number; height?: number },
): ClassificationResult {
  const features: ColorFeatures = {
    featureSchemaVersion: 2,
    lab,
    labUndertone: lab,
    labHair: extras?.labHair ?? null,
    labEyes: extras?.labEyes ?? null,
    temperatureScore: Number((lab.b * 0.7 + lab.a * 0.3).toFixed(2)),
    valueScore: Number(lab.L.toFixed(2)),
    chromaScore: Number(chromaFromLab(lab).toFixed(2)),
    contrastScore: extras?.contrastScore ?? 20,
    contrastSource: extras?.contrastSource ?? "skin_l",
    skinPixelRatio: extras?.skinPixelRatio ?? 0.12,
    sampleCount: extras?.sampleCount ?? 1000,
    detectorProvider: extras?.detectorProvider ?? "test",
    faceBox: extras?.faceBox ?? {
      x: 0.25,
      y: 0.12,
      width: 0.5,
      height: 0.55,
      score: 1,
    },
    roiLabs: extras?.roiLabs ?? [],
  };
  const predictor = createColorPredictor();
  const { seasonId, undertoneLabel, confidence } = predictor.predict(features);
  const photoQuality: PhotoQuality = {
    width: extras?.width ?? 800,
    height: extras?.height ?? 800,
    faceLikeDetected: true,
    faceDetected: true,
    detectorProvider: features.detectorProvider,
    usedFaceFallback: false,
    lightingWarning: false,
    roiConsistencyWarning: false,
    qualityBand: "boa",
    warnings: [],
    failedTips: [],
  };
  return {
    seasonId,
    confidence,
    undertoneLabel,
    features,
    photoQuality,
    needsReview: shouldNeedsReview({
      confidence,
      temperatureScore: features.temperatureScore,
      faceLikeDetected: true,
      lightingWarning: false,
      usedFaceFallback: false,
    }),
    predictorId: predictor.id,
    confidenceBreakdown: undefined,
  };
}
