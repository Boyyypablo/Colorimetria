import { HeuristicFaceDetector } from "./providers/heuristic";
import type { FaceDetectionResult, FaceDetector } from "./types";

export type FaceDetectorId = "heuristic" | "blazeface" | "onnx-yunet";

const heuristic = new HeuristicFaceDetector();

export function resolveFaceDetectorId(
  raw = process.env.FACE_DETECTOR,
): FaceDetectorId {
  const id = (raw?.trim() || "blazeface").toLowerCase();
  if (id === "blazeface" || id === "onnx-yunet" || id === "heuristic") return id;
  return "heuristic";
}

export async function createFaceDetector(
  id?: FaceDetectorId,
): Promise<FaceDetector> {
  const resolved = id ?? resolveFaceDetectorId();
  switch (resolved) {
    case "blazeface": {
      const { BlazeFaceDetector } = await import("./providers/blazeface");
      return new BlazeFaceDetector();
    }
    case "onnx-yunet": {
      const { OnnxYunetDetector } = await import("./providers/blazeface");
      return new OnnxYunetDetector();
    }
    default:
      return heuristic;
  }
}

/**
 * Detecta rosto com o provider configurado.
 * P0.2: Rejeita foto (throw) quando detector primário falha E heuristic não encontra rosto confiável.
 * Exceção de load/runtime → heuristic fallback.
 * Zero rostos com sucesso do provider → devolve primary null (análise decide NEEDS_REVIEW).
 */
export async function detectFaceWithFallback(
  buffer: Buffer,
  width: number,
  height: number,
  preferred?: FaceDetectorId,
): Promise<FaceDetectionResult> {
  const id = preferred ?? resolveFaceDetectorId();
  const primary = await createFaceDetector(id);

  try {
    const result = await primary.detect(buffer, width, height);
    // P0.2: Se detector primário não achou rosto confiável (zero faces), rejeitar
    if (result.faces.length === 0 && id !== "heuristic") {
      throw new Error("FACE_NOT_DETECTED");
    }
    return result;
  } catch (err) {
    if (id === "heuristic") throw err;
    
    // P0.2: Tentar heuristic como fallback
    const fallback = await heuristic.detect(buffer, width, height);
    
    // P0.2: Se heuristic também não encontrou rosto confiável, rejeitar foto
    if (fallback.usedFallback && fallback.primary && fallback.primary.score < 0.12) {
      throw new Error(
        "Não conseguimos localizar seu rosto na foto. Tire uma selfie frontal com seu rosto centralizado, iluminação natural e tente novamente."
      );
    }
    
    const msg =
      err instanceof Error && err.message === "FACE_NOT_DETECTED"
        ? "Nenhum rosto detectado"
        : err instanceof Error
          ? err.message
          : "Falha no detector configurado";
    return {
      ...fallback,
      provider: `heuristic(fallback-from:${id})`,
      usedFallback: true,
      warnings: [
        ...fallback.warnings,
        `Detector "${id}" indisponível (${msg}). Usando heuristic.`,
      ],
    };
  }
}

export type { FaceBox, FaceDetectionResult, FaceDetector, FaceRoi } from "./types";
export { roisFromFaceBox, analysisCropFromFace, boxToPixels } from "./rois";
