import { analysisCropFromFace } from "./rois";
import { findSkinFaceWindow } from "./scan";
import type { FaceBox } from "./types";

type NativeFaceDetector = {
  detect: (image: ImageBitmap) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

type FaceDetectorCtor = new (opts?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => NativeFaceDetector;

export type BrowserFaceResult = {
  box: FaceBox;
  found: boolean;
  provider: "native" | "heuristic";
  imageWidth: number;
  imageHeight: number;
};

function nativeCtor(): FaceDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (
    window as Window & { FaceDetector?: FaceDetectorCtor }
  ).FaceDetector;
  return ctor ?? null;
}

async function detectNative(bitmap: ImageBitmap): Promise<FaceBox | null> {
  const Ctor = nativeCtor();
  if (!Ctor) return null;
  const detector = new Ctor({ fastMode: true, maxDetectedFaces: 1 });
  const faces = await detector.detect(bitmap);
  const first = faces[0];
  if (!first) return null;
  const { x, y, width, height } = first.boundingBox;
  if (width < 8 || height < 8) return null;
  return {
    x: x / bitmap.width,
    y: y / bitmap.height,
    width: width / bitmap.width,
    height: height / bitmap.height,
    score: 1,
  };
}

function withSize(
  bitmap: ImageBitmap,
  rest: Omit<BrowserFaceResult, "imageWidth" | "imageHeight">,
): BrowserFaceResult {
  return { ...rest, imageWidth: bitmap.width, imageHeight: bitmap.height };
}

function detectHeuristic(bitmap: ImageBitmap): BrowserFaceResult {
  const scanSize = 160;
  const scale = Math.min(1, scanSize / Math.max(bitmap.width, bitmap.height));
  const sw = Math.max(1, Math.round(bitmap.width * scale));
  const sh = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return withSize(bitmap, {
      box: { x: 0.25, y: 0.12, width: 0.5, height: 0.55, score: 0 },
      found: false,
      provider: "heuristic",
    });
  }
  ctx.drawImage(bitmap, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const scanned = findSkinFaceWindow(data, sw, sh, 4);
  return withSize(bitmap, {
    box: scanned.usedFallback ? scanned.box : analysisCropFromFace(scanned.box),
    found: !scanned.usedFallback,
    provider: "heuristic",
  });
}

async function decodeBitmap(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(source);
  }
}

/** Detecta o rosto no cliente — a foto não sai do aparelho até o envio. */
export async function detectFaceInBrowser(source: Blob): Promise<BrowserFaceResult> {
  const bitmap = await decodeBitmap(source);
  try {
    try {
      const native = await detectNative(bitmap);
      if (native) {
        return withSize(bitmap, {
          box: analysisCropFromFace(native),
          found: true,
          provider: "native",
        });
      }
    } catch {
      /* FaceDetector ausente ou recusado — cai na heurística. */
    }
    return detectHeuristic(bitmap);
  } finally {
    bitmap.close();
  }
}
