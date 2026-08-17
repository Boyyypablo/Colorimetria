import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { GARMENT_KINDS, type GarmentKind } from "../../../data/wardrobe/garments";
import { WARDROBE_PHOTO_SOURCES } from "../../../data/wardrobe/photos/manifest";
import { composeLookPhoto, cropGarmentPhoto } from "./photo";

const photosDir = () => path.join(process.cwd(), "data", "wardrobe", "photos");

const cache = new Map<string, Buffer>();
const CACHE_MAX = 64;

export function isGarmentKind(value: string): value is GarmentKind {
  return (GARMENT_KINDS as readonly string[]).includes(value);
}

async function loadCroppedPhoto(kind: GarmentKind): Promise<Buffer> {
  try {
    return await readFile(path.join(photosDir(), `${kind}.jpg`));
  } catch {
    const src = WARDROBE_PHOTO_SOURCES[kind];
    const raw = await readFile(path.join(photosDir(), "src", src.file));
    return cropGarmentPhoto(raw, src.position);
  }
}

export async function renderWardrobeLook(
  kind: GarmentKind,
  hex: string,
): Promise<Buffer> {
  const key = `${kind}:${hex.toUpperCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const cropped = await loadCroppedPhoto(kind);
  const jpeg = await composeLookPhoto(cropped, hex);

  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, jpeg);
  return jpeg;
}

export async function exportWardrobeLayers(): Promise<
  Array<{ fileName: string; buffer: Buffer }>
> {
  const layers: Array<{ fileName: string; buffer: Buffer }> = [];
  for (const kind of GARMENT_KINDS) {
    const src = WARDROBE_PHOTO_SOURCES[kind];
    const raw = await readFile(path.join(photosDir(), "src", src.file));
    layers.push({
      fileName: `${kind}.jpg`,
      buffer: await cropGarmentPhoto(raw, src.position),
    });
  }
  return layers;
}
