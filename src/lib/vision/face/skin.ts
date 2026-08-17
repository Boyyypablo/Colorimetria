/** Heurística YCbCr — tons profundos e oliváceos (não exige r>g e r>b rígidos). */
export function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const oliveOk = r + 18 >= g && r + 10 >= b;
  return (
    y > 28 &&
    y < 245 &&
    cb >= 70 &&
    cb <= 135 &&
    cr >= 125 &&
    cr <= 180 &&
    r > 40 &&
    g > 20 &&
    b > 10 &&
    oliveOk &&
    Math.abs(r - g) < 95
  );
}

/** Cabelo / sobrancelha: não-pele, evita branco puro e saturação extrema. */
export function isHairPixel(r: number, g: number, b: number): boolean {
  if (isSkinPixel(r, g, b)) return false;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  if (y < 8 || y > 210) return false;
  if (r > 230 && g > 230 && b > 230) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return sat < 0.65;
}

/** Candidatos a íris/pupila na ROI dos olhos. */
export function isEyePixel(r: number, g: number, b: number): boolean {
  if (isSkinPixel(r, g, b)) return false;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return y > 12 && y < 170;
}
