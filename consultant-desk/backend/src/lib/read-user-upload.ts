import { access, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
/** monorepo root = consultant-desk/backend/src/lib → ../../../../ */
const monorepoRoot = resolve(here, "../../../../");

function uploadRoot(): string {
  if (process.env.UPLOAD_DIR) {
    return resolve(process.env.UPLOAD_DIR);
  }
  return resolve(monorepoRoot, "uploads");
}

/**
 * Lê upload relativo `userId/arquivo.ext` do storage local do monorepo.
 * (Blob Vercel: configure UPLOAD via app principal; desk local usa disco.)
 */
export async function readUserUpload(
  relativePath: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const cleaned = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !cleaned ||
    cleaned.includes("..") ||
    cleaned.split("/").length < 2 ||
    cleaned.length > 240
  ) {
    return null;
  }

  const root = uploadRoot();
  const full = resolve(root, cleaned);
  const rootSep = root.endsWith(sep) ? root : root + sep;
  if (full !== root && !full.startsWith(rootSep)) return null;

  try {
    await access(full);
    const buffer = await readFile(full);
    const ext = cleaned.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";
    return { buffer, contentType };
  } catch {
    return null;
  }
}
