import type { GarmentKind } from "../garments";

/** Pack fotográfico — Unsplash License / Pexels License (uso comercial, atribuição opcional). */
export type WardrobePhotoSource = {
  file: string;
  position: "left" | "centre" | "right" | "top";
  license: "unsplash" | "pexels";
  credit: string;
  url: string;
};

export const WARDROBE_PHOTO_SOURCES: Record<GarmentKind, WardrobePhotoSource> = {
  camisa: {
    file: "camisa-unsplash.jpg",
    position: "left",
    license: "unsplash",
    credit: "Nimble Made / Unsplash",
    url: "https://unsplash.com/photos/hMMXhKSZk7k",
  },
  blusa: {
    file: "blusa-pexels.jpg",
    position: "centre",
    license: "pexels",
    credit: "Pexels (7671168)",
    url: "https://www.pexels.com/photo/7671168/",
  },
  vestido: {
    file: "vestido-pexels.jpg",
    position: "centre",
    license: "pexels",
    credit: "Alexander Mass / Pexels",
    url: "https://www.pexels.com/photo/35538618/",
  },
  casaco: {
    file: "casaco-unsplash.jpg",
    position: "centre",
    license: "unsplash",
    credit: "Unsplash (photo-1591047139829)",
    url: "https://unsplash.com/photos/Fg15LdqpWrs",
  },
};
