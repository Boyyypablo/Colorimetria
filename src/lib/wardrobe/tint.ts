import sharp from "sharp";
import { hexToRgb } from "@/lib/vto/color-edit";

/** Recolore pixels opacos pela luminância, preservando dobras. */
export async function tintGarmentPng(source: Buffer, hex: string): Promise<Buffer> {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { r: tr, g: tg, b: tb } = hexToRgb(hex);
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const y = (0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2]) / 255;
    out[i] = Math.round(tr * y);
    out[i + 1] = Math.round(tg * y);
    out[i + 2] = Math.round(tb * y);
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
