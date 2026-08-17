import { GARMENT_SHAPES, GARMENT_VIEWBOX } from "../../../data/wardrobe/shapes";
import type { GarmentKind } from "../../../data/wardrobe/garments";

const STUDIO_W = 400;
const STUDIO_H = 520;

/** Cinza médio — o tint preserva sombras via luminância. */
const GARMENT_GRAY = "#9a9a9a";
const GARMENT_SHADOW = "#6e6e6e";

export function garmentLayerSvg(kind: GarmentKind): string {
  const shape = GARMENT_SHAPES[kind];
  const folds = shape.details
    ? `<path d="${shape.details}" fill="none" stroke="${GARMENT_SHADOW}" stroke-width="1.4" stroke-linecap="round"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${STUDIO_W}" height="${STUDIO_H}" viewBox="0 0 ${STUDIO_W} ${STUDIO_H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${GARMENT_SHADOW}"/>
      <stop offset="0.45" stop-color="${GARMENT_GRAY}"/>
      <stop offset="1" stop-color="${GARMENT_SHADOW}"/>
    </linearGradient>
  </defs>
  <g transform="translate(40 58) scale(4)">
    <path d="${shape.body}" fill="url(#g)" stroke="#5a5a5a" stroke-width="0.6"/>
    ${folds}
  </g>
</svg>`;
}

export function mannequinLayerSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${STUDIO_W}" height="${STUDIO_H}" viewBox="0 0 ${STUDIO_W} ${STUDIO_H}">
  <defs>
    <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c4a07e"/>
      <stop offset="0.5" stop-color="#e2c4a6"/>
      <stop offset="1" stop-color="#c4a07e"/>
    </linearGradient>
    <radialGradient id="shade" cx="42%" cy="38%" r="70%">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.14"/>
    </radialGradient>
  </defs>
  <ellipse cx="200" cy="498" rx="78" ry="10" fill="#d9cfc3" opacity="0.9"/>
  <rect x="194" y="400" width="12" height="96" rx="3" fill="#b7a898"/>
  <path d="M176 64 H224 V112 Q200 126 176 112 Z" fill="url(#skin)"/>
  <ellipse cx="200" cy="188" rx="84" ry="86" fill="url(#skin)"/>
  <path d="M122 210 Q118 300 168 400 H232 Q282 300 278 210 Q200 248 122 210 Z" fill="url(#skin)"/>
  <ellipse cx="200" cy="188" rx="84" ry="86" fill="url(#shade)"/>
</svg>`;
}

export function studioBackgroundSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${STUDIO_W}" height="${STUDIO_H}" viewBox="0 0 ${STUDIO_W} ${STUDIO_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f3ec"/>
      <stop offset="1" stop-color="#efe6d8"/>
    </linearGradient>
  </defs>
  <rect width="${STUDIO_W}" height="${STUDIO_H}" fill="url(#bg)"/>
</svg>`;
}

export { GARMENT_VIEWBOX, STUDIO_W, STUDIO_H };
