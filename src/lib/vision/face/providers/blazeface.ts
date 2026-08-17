import sharp from "sharp";
import { analysisCropFromFace, roisFromFaceBox } from "../rois";
import type { FaceBox, FaceDetectionResult, FaceDetector } from "../types";

type BlazeFaceModel = {
  estimateFaces: (
    input: unknown,
    returnTensors?: boolean,
  ) => Promise<
    Array<{
      topLeft: [number, number] | { arraySync?: () => number[] };
      bottomRight: [number, number] | { arraySync?: () => number[] };
      probability?: number[] | { arraySync?: () => number[] };
    }>
  >;
};

let modelPromise: Promise<BlazeFaceModel> | null = null;

async function loadModel(): Promise<BlazeFaceModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      if (typeof window === "undefined") {
        await tf.setBackend("cpu");
      }
      await tf.ready();
      const blazeface = await import("@tensorflow-models/blazeface");
      return blazeface.load({ maxFaces: 3 }) as Promise<BlazeFaceModel>;
    })();
  }
  return modelPromise;
}

function asPair(
  value: [number, number] | { arraySync?: () => number[] },
): [number, number] {
  if (Array.isArray(value)) return [value[0]!, value[1]!];
  const arr = value.arraySync?.() ?? [0, 0];
  return [Number(arr[0] ?? 0), Number(arr[1] ?? 0)];
}

function asProb(
  value: number[] | { arraySync?: () => number[] } | undefined,
): number {
  if (!value) return 0.9;
  if (Array.isArray(value)) return Number(value[0] ?? 0.9);
  const arr = value.arraySync?.() ?? [0.9];
  return Number(arr[0] ?? 0.9);
}

/**
 * BlazeFace (TF.js) — bbox real em selfies.
 * Padrão: FACE_DETECTOR=blazeface (heuristic só fallback ou env explícito).
 * Exceção de load/runtime → factory faz fallback para heuristic.
 * Zero rostos → primary null (não inventa face).
 */
export class BlazeFaceDetector implements FaceDetector {
  readonly id = "blazeface";

  async detect(
    buffer: Buffer,
    _width: number,
    _height: number,
  ): Promise<FaceDetectionResult> {
    const tf = await import("@tensorflow/tfjs");
    const model = await loadModel();

    const { data, info } = await sharp(buffer)
      .rotate()
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const imgW = info.width;
    const imgH = info.height;
    if (info.channels < 3) {
      throw new Error("BlazeFace requer imagem RGB");
    }

    const input = tf.tensor3d(new Uint8Array(data), [imgH, imgW, 3]);
    try {
      const predictions = await model.estimateFaces(input, false);
      const boxes: FaceBox[] = predictions.map((p) => {
        const [x1, y1] = asPair(p.topLeft);
        const [x2, y2] = asPair(p.bottomRight);
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const right = Math.max(x1, x2);
        const bottom = Math.max(y1, y2);
        return {
          x: left / imgW,
          y: top / imgH,
          width: Math.max(0, right - left) / imgW,
          height: Math.max(0, bottom - top) / imgH,
          score: asProb(p.probability),
        };
      });

      boxes.sort(
        (a, b) => b.width * b.height * b.score - a.width * a.height * a.score,
      );

      if (boxes.length === 0) {
        return {
          provider: this.id,
          faces: [],
          primary: null,
          rois: [],
          warnings: ["BlazeFace: nenhum rosto detectado na imagem."],
          usedFallback: false,
        };
      }

      const primary = analysisCropFromFace(boxes[0]!);
      return {
        provider: this.id,
        faces: boxes,
        primary,
        rois: roisFromFaceBox(primary),
        warnings: [],
        usedFallback: false,
      };
    } finally {
      input.dispose();
    }
  }
}

/** Stub para swap futuro (YuNet ONNX). */
export class OnnxYunetDetector implements FaceDetector {
  readonly id = "onnx-yunet";

  async detect(
    _buffer: Buffer,
    _width: number,
    _height: number,
  ): Promise<FaceDetectionResult> {
    throw new Error(
      "Provider onnx-yunet reservado. Use FACE_DETECTOR=blazeface ou heuristic.",
    );
  }
}
