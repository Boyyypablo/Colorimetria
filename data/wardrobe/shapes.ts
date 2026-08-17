import type { GarmentKind } from "./garments";

/** viewBox compartilhado das silhuetas (80×96). */
export const GARMENT_VIEWBOX = "0 0 80 96";

export type GarmentShape = {
  body: string;
  details?: string;
};

export const GARMENT_SHAPES: Record<GarmentKind, GarmentShape> = {
  blusa: {
    body: "M18 18 L28 8 H52 L62 18 L72 28 V36 L62 32 V88 H18 V32 L8 36 V28 Z",
  },
  camisa: {
    body: "M16 20 L28 8 H52 L64 20 L74 30 V38 L64 34 V88 H16 V34 L6 38 V30 Z",
    details: "M40 8 V88 M32 8 L40 22 L48 8",
  },
  vestido: {
    body: "M28 8 H52 L58 20 L68 28 V34 L58 32 L70 90 H10 L22 32 L12 34 V28 L22 20 Z",
  },
  casaco: {
    body: "M14 18 L26 8 H54 L66 18 L76 32 V40 L66 36 V92 H14 V36 L4 40 V32 Z",
    details: "M40 12 V92",
  },
};
