/**
 * Fotos Unsplash da landing (export Figma Make).
 * O next/image cuida do DPR (não use dpr= na URL).
 */
const u = (id: string, w: number, h?: number) => {
  const size = h ? `w=${w}&h=${h}&fit=crop` : `w=${w}&fit=crop`;
  return `https://images.unsplash.com/${id}?${size}&auto=format`;
};

export const LANDING_IMAGES = {
  hero: u("photo-1563170446-9c3c0622d8a9", 900, 1100),
  serviceColor: u("photo-1596704017254-9b121068fb31", 600, 400),
  serviceMakeup: u("photo-1762745176875-b448ee7b8942", 600, 400),
  serviceVisual: u("photo-1618244965061-1d27b208d6e8", 600, 400),
  serviceFashion: u("photo-1567401893414-76b7b1e5a7a5", 600, 400),
  about: u("photo-1525845859779-54d477ff291f", 600, 760),
  consultPortrait: u("photo-1534528741775-53994a69daeb", 800, 1000),
  consultMakeup: u("photo-1596462502278-27bfdc403348", 700, 480),
  consultColor: u("photo-1487412947147-5cebf100ffc2", 700, 480),
  stripMakeup: u("photo-1709477542149-f4e0e21d590b", 700, 500),
  stripFashion: u("photo-1662532577856-e8ee8b138a8b", 700, 500),
  stripColor: u("photo-1542833807-ad5af0977050", 700, 500),
} as const;

export const LANDING_IMAGE_QUALITY = 92;

export const LANDING_SEASON_SWATCHES = [
  "#C4704A",
  "#E8C4A0",
  "#8FA0B0",
  "#7A9180",
  "#B8A0C8",
  "#D4B060",
  "#9A6878",
  "#A0B890",
] as const;
