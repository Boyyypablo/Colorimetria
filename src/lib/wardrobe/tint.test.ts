import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { tintGarmentPng, HEX_COLOR } from "@/lib/wardrobe/tint";
import { isGarmentKind, renderWardrobeLook } from "@/lib/wardrobe/render";
import { attachGarments } from "@/lib/wardrobe/looks";

describe("wardrobe photo tint", () => {
  it("aceita hex canônico", () => {
    expect(HEX_COLOR.test("#E63946")).toBe(true);
    expect(HEX_COLOR.test("E63946")).toBe(false);
  });

  it("recolore pixel cinza e ignora transparente", async () => {
    const gray = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: { r: 128, g: 128, b: 128, alpha: 255 },
      },
    })
      .png()
      .toBuffer();
    const clear = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: { r: 128, g: 128, b: 128, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const red = await tintGarmentPng(gray, "#FF0000");
    const { data: redPx } = await sharp(red).raw().toBuffer({ resolveWithObject: true });
    expect(redPx[0]).toBeGreaterThan(80);
    expect(redPx[1]).toBeLessThan(40);
    expect(redPx[2]).toBeLessThan(40);

    const stillClear = await tintGarmentPng(clear, "#FF0000");
    const { data: clearPx } = await sharp(stillClear)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(clearPx[3]).toBe(0);
  });
});

describe("wardrobe render", () => {
  it("reconhece peças do catálogo", () => {
    expect(isGarmentKind("blusa")).toBe(true);
    expect(isGarmentKind("saia")).toBe(false);
  });

  it("isola fundo claro e preserva o objeto", async () => {
    const { cropGarmentPhoto } = await import("@/lib/wardrobe/photo");
    const src = await sharp({
      create: {
        width: 40,
        height: 50,
        channels: 3,
        background: { r: 240, g: 236, b: 228 },
      },
    })
      .jpeg()
      .toBuffer();

    const cropped = await cropGarmentPhoto(src, "centre");
    const meta = await sharp(cropped).metadata();
    expect(meta.width).toBe(480);
    expect(meta.height).toBe(620);
    expect(meta.format).toBe("jpeg");
  });

  it("gera jpeg da peça na cor pedida", async () => {
    const jpeg = await renderWardrobeLook("blusa", "#E63946");
    expect(jpeg[0]).toBe(0xff);
    expect(jpeg[1]).toBe(0xd8);
    expect(jpeg.byteLength).toBeGreaterThan(1000);
  });
});

describe("attachGarments photoUrl", () => {
  it("aponta para a API de peça+hex", () => {
    const [look] = attachGarments(
      [{ hex: "#FF6B35", label: "Coral", context: ["casual"] }],
      "casual",
    );
    expect(look.photoUrl).toBe("/wardrobe/blusa.jpg");
  });
});
