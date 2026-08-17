/**
 * `object-position` (%) para `object-fit: cover` com o foco (rosto) no centro da moldura.
 * fx/fy em 0–1 relativos à imagem.
 */
export function coverFocusPosition(
  fx: number,
  fy: number,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number } {
  if (imageWidth <= 0 || imageHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) {
    return { x: 50, y: 40 };
  }

  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
  const scaledW = imageWidth * scale;
  const scaledH = imageHeight * scale;
  const extraX = scaledW - frameWidth;
  const extraY = scaledH - frameHeight;

  return {
    x: axisPosition(fx * scaledW, frameWidth, extraX),
    y: axisPosition(fy * scaledH, frameHeight, extraY),
  };
}

function axisPosition(focusPx: number, frame: number, extra: number): number {
  if (extra <= 0) return 50;
  const crop = focusPx - frame / 2;
  return (Math.min(extra, Math.max(0, crop)) / extra) * 100;
}
