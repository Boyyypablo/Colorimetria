import {
  GARMENT_LABEL,
  GARMENTS_BY_CONTEXT,
  type GarmentKind,
} from "../../../data/wardrobe/garments";
import type { ColorSwatch } from "@/lib/color/types";

export type WardrobeLook = ColorSwatch & {
  garment: GarmentKind;
  garmentLabel: string;
  photoUrl: string;
};

export function wardrobePhotoUrl(kind: GarmentKind, _hex: string): string {
  return `/wardrobe/${kind}.jpg`;
}

export function pickGarment(
  context: "trabalho" | "casual" | "noite",
  index: number,
): GarmentKind {
  const cycle = GARMENTS_BY_CONTEXT[context];
  return cycle[index % cycle.length];
}

export function attachGarments(
  items: ColorSwatch[],
  analysisContext: "trabalho" | "casual" | "noite" = "casual",
): WardrobeLook[] {
  const seen: Record<string, number> = {
    trabalho: 0,
    casual: 0,
    noite: 0,
  };

  return items.map((item) => {
    const context = item.context?.[0] ?? analysisContext;
    const index = seen[context] ?? 0;
    seen[context] = index + 1;
    const garment = pickGarment(context, index);
    return {
      ...item,
      garment,
      garmentLabel: GARMENT_LABEL[garment],
      photoUrl: wardrobePhotoUrl(garment, item.hex),
    };
  });
}
