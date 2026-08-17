import { isSkinPixel } from "./skin";
import type { FaceBox } from "./types";

export type SkinScanResult = {
  box: FaceBox;
  usedFallback: boolean;
};

/**
 * Varre janelas numa miniatura e escolhe a de maior densidade de pele.
 * `data` em RGB(A) packed, origem top-left.
 */
export function findSkinFaceWindow(
  data: ArrayLike<number>,
  sw: number,
  sh: number,
  channels: number,
): SkinScanResult {
  const winW = Math.max(24, Math.floor(sw * 0.45));
  const winH = Math.max(28, Math.floor(sh * 0.55));
  const step = Math.max(6, Math.floor(winW / 4));

  let best: { score: number; x: number; y: number; w: number; h: number } | null =
    null;

  for (let y = 0; y <= sh - winH; y += step) {
    for (let x = 0; x <= sw - winW; x += step) {
      let skin = 0;
      let total = 0;
      for (let py = y; py < y + winH; py += 2) {
        for (let px = x; px < x + winW; px += 2) {
          const i = (py * sw + px) * channels;
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          total += 1;
          if (isSkinPixel(r, g, b)) skin += 1;
        }
      }
      const density = skin / Math.max(1, total);
      const centerBias =
        1 -
        Math.abs(y + winH / 2 - sh * 0.42) / sh -
        Math.abs(x + winW / 2 - sw / 2) / sw;
      const score = density * 0.85 + Math.max(0, centerBias) * 0.15;
      if (!best || score > best.score) {
        best = { score, x, y, w: winW, h: winH };
      }
    }
  }

  if (!best || best.score < 0.04) {
    return {
      usedFallback: true,
      box: {
        x: 0.25,
        y: 0.12,
        width: 0.5,
        height: 0.55,
        score: best?.score ?? 0,
      },
    };
  }

  return {
    usedFallback: false,
    box: {
      x: best.x / sw,
      y: best.y / sh,
      width: best.w / sw,
      height: best.h / sh,
      score: Number(best.score.toFixed(4)),
    },
  };
}
