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
 * Exceção de load/runtime → heuristic.
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
    return await primary.detect(buffer, width, height);
  } catch (err) {
    if (id === "heuristic") throw err;
    const fallback = await heuristic.detect(buffer, width, height);
    const msg =
      err instanceof Error ? err.message : "Falha no detector configurado";
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
