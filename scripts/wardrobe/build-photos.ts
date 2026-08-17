import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { exportWardrobeLayers } from "../../src/lib/wardrobe/render";

const outDir = path.join(process.cwd(), "data", "wardrobe", "photos");

async function main() {
  await mkdir(outDir, { recursive: true });
  const layers = await exportWardrobeLayers();
  for (const layer of layers) {
    const dest = path.join(outDir, layer.fileName);
    await writeFile(dest, layer.buffer);
    console.log(dest);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
