/** Peças-modelo da análise — catálogo próprio, sem scrap de loja. */

export const GARMENT_KINDS = ["blusa", "camisa", "vestido", "casaco"] as const;

export type GarmentKind = (typeof GARMENT_KINDS)[number];

export const GARMENT_LABEL: Record<GarmentKind, string> = {
  blusa: "Blusa",
  camisa: "Camisa",
  vestido: "Vestido",
  casaco: "Casaco",
};

/** Ordem de peças por contexto da análise / do swatch. */
export const GARMENTS_BY_CONTEXT: Record<
  "trabalho" | "casual" | "noite",
  GarmentKind[]
> = {
  casual: ["blusa", "casaco"],
  trabalho: ["camisa", "blusa"],
  noite: ["vestido", "blusa"],
};
