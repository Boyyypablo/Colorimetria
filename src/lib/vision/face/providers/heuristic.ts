import sharp from "sharp";
import { analysisCropFromFace, roisFromFaceBox } from "../rois";
import { findSkinFaceWindow } from "../scan";
import type { FaceDetectionResult, FaceDetector } from "../types";

export { isEyePixel, isHairPixel, isSkinPixel } from "../skin";

/**
 * Provider default sem deps extras: varre janelas e escolhe a de maior densidade de pele.
 * Sempre disponível — fallback oficial quando BlazeFace/YuNet falharem.
 */
export class HeuristicFaceDetector implements FaceDetector {
  readonly id = "heuristic";

  async detect(
    buffer: Buffer,
    width: number,
    height: number,
  ): Promise<FaceDetectionResult> {
    const warnings: string[] = [];
    const scanSize = 160;
    const { data, info } = await sharp(buffer)
      .rotate()
      .ensureAlpha()
      .resize({ width: scanSize, height: scanSize, fit: "inside" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const scanned = findSkinFaceWindow(
      data,
      info.width,
      info.height,
      info.channels,
    );

    void width;
    void height;

    if (scanned.usedFallback) {
      warnings.push(
        "Não localizamos o rosto com segurança — usamos o centro da foto. Refaça com selfie frontal.",
      );
      return {
        provider: this.id,
        faces: [],
        primary: scanned.box,
        rois: roisFromFaceBox(scanned.box),
        warnings,
        usedFallback: true,
      };
    }

    const crop = analysisCropFromFace(scanned.box);
    return {
      provider: this.id,
      faces: [scanned.box],
      primary: crop,
      rois: roisFromFaceBox(crop),
      warnings,
      usedFallback: false,
    };
  }
}
