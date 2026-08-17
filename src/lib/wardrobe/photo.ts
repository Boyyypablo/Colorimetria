import sharp from "sharp";
import { hexToRgb } from "@/lib/vto/color-edit";

const W = 480;
const H = 620;
const BAR = 56;

/** Recorte de estúdio — sem recorte de fundo (evita buracos no tecido claro). */
export async function cropGarmentPhoto(
  source: Buffer,
  position: "left" | "centre" | "right" | "top" = "centre",
): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize(W, H, { fit: "cover", position })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** Foto original + faixa da cor da cartela. */
export async function composeLookPhoto(croppedJpeg: Buffer, hex: string): Promise<Buffer> {
  const { r, g, b } = hexToRgb(hex);
  const bar = await sharp({
    create: { width: W, height: BAR, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer();

  return sharp(croppedJpeg)
    .resize(W, H, { fit: "cover" })
    .composite([{ input: bar, gravity: "south" }])
    .jpeg({ quality: 88 })
    .toBuffer();
}
