import { describe, expect, it } from "vitest";
import { coverFocusPosition } from "@/lib/vision/face/frame";
import { findSkinFaceWindow } from "@/lib/vision/face/scan";

describe("coverFocusPosition", () => {
  it("imagem larga na moldura: foco à esquerda → object-position X baixo", () => {
    const left = coverFocusPosition(0.2, 0.45, 2000, 900, 640, 360);
    const right = coverFocusPosition(0.8, 0.45, 2000, 900, 640, 360);
    expect(left.x).toBeLessThan(50);
    expect(right.x).toBeGreaterThan(50);
  });

  it("selfie alta: foco no terço superior → Y baixo (mostra a cabeça)", () => {
    const top = coverFocusPosition(0.5, 0.22, 900, 1600, 640, 320);
    const bottom = coverFocusPosition(0.5, 0.85, 900, 1600, 640, 320);
    expect(top.y).toBeLessThan(bottom.y);
    expect(top.y).toBeLessThan(50);
  });

  it("rosto no centro → ~50/50 quando a imagem cobre os dois eixos", () => {
    const mid = coverFocusPosition(0.5, 0.5, 1000, 1000, 400, 400);
    expect(mid.x).toBe(50);
    expect(mid.y).toBe(50);
  });
});

describe("findSkinFaceWindow", () => {
  it("acha o bloco de pele à direita", () => {
    const w = 80;
    const h = 80;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const inFace = x > 42 && x < 74 && y > 12 && y < 62;
        if (inFace) {
          data[i] = 210;
          data[i + 1] = 160;
          data[i + 2] = 120;
        } else {
          data[i] = 30;
          data[i + 1] = 60;
          data[i + 2] = 180;
        }
        data[i + 3] = 255;
      }
    }
    const result = findSkinFaceWindow(data, w, h, 4);
    expect(result.usedFallback).toBe(false);
    const cx = result.box.x + result.box.width / 2;
    expect(cx).toBeGreaterThan(0.5);
  });
});
