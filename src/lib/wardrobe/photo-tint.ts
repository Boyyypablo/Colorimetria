import { hexToRgb } from "@/lib/color/cielab";
import type { GarmentKind } from "../../../data/wardrobe/garments";

/** Cor média do recorte central de `public/wardrobe/{kind}.jpg` (luma sRGB). */
export const WARDROBE_PHOTO_NATIVE: Record<
  GarmentKind,
  { hex: string; luma: number }
> = {
  blusa: { hex: "#847767", luma: 121 },
  casaco: { hex: "#af6950", luma: 118 },
  camisa: { hex: "#c5ab8f", luma: 175 },
  vestido: { hex: "#bda59a", luma: 169 },
};

const NEAR_WHITE_LUMA = 230;

export type PhotoTintPlan = {
  apply: boolean;
  multiplyOpacity: number;
};

export function hexLuma(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Overlay CSS: `color` para o matiz da cartela; `multiply` se a paleta for mais escura que a foto. */
export function photoTintPlan(
  targetHex: string,
  photoLuma: number,
): PhotoTintPlan {
  const targetLuma = hexLuma(targetHex);
  if (targetLuma >= NEAR_WHITE_LUMA) {
    return { apply: false, multiplyOpacity: 0 };
  }
  const gap = Math.max(0, photoLuma - targetLuma);
  return {
    apply: true,
    multiplyOpacity: Math.min(0.58, gap / 220),
  };
}

export function photoTintForKind(kind: GarmentKind, hex: string): PhotoTintPlan {
  return photoTintPlan(hex, WARDROBE_PHOTO_NATIVE[kind].luma);
}
