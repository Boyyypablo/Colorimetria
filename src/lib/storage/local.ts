import { mkdir, writeFile, readFile, unlink, access } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import {
  assertRelativeUploadPath,
  contentTypeForExtension,
  isValidOwnerId,
  uploadOwnerId,
} from "@/lib/storage/paths";

export { uploadOwnerId, assertRelativeUploadPath } from "@/lib/storage/paths";

function uploadRoot(): string {
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
  );
}

function isBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function ensureUploadDir(...segments: string[]): Promise<string> {
  const dir = path.join(uploadRoot(), ...segments);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Resolve path relativo `userId/arquivo.ext` de forma segura (anti path-traversal).
 * Apenas para storage local em disco.
 */
export function resolveUploadPath(relativePath: string): string {
  const { ownerId, filename } = assertRelativeUploadPath(relativePath);
  const root = uploadRoot();
  const full = path.resolve(root, ownerId, filename);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (full !== root && !full.startsWith(rootWithSep)) {
    throw new Error("Caminho de upload inválido");
  }
  return full;
}

export async function saveUserImage(
  userId: string,
  buffer: Buffer,
  extension = "jpg",
): Promise<string> {
  if (!isValidOwnerId(userId)) {
    throw new Error("userId inválido para upload");
  }
  const ext = extension.replace(/^\./, "") || "jpg";
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const relative = `${userId}/${filename}`;

  if (isBlobStorageEnabled()) {
    await put(relative, buffer, {
      access: "private",
      addRandomSuffix: false,
      contentType: contentTypeForExtension(ext),
    });
    return relative;
  }

  const dir = await ensureUploadDir(userId);
  await writeFile(path.join(dir, filename), buffer);
  return relative;
}

export async function readUpload(relativePath: string): Promise<Buffer> {
  const { relative } = assertRelativeUploadPath(relativePath);

  if (isBlobStorageEnabled()) {
    const result = await get(relative, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Arquivo não encontrado");
    }
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }

  return readFile(resolveUploadPath(relative));
}

export async function deleteUpload(relativePath: string): Promise<void> {
  const { relative } = assertRelativeUploadPath(relativePath);
  try {
    if (isBlobStorageEnabled()) {
      await del(relative);
      return;
    }
    await unlink(resolveUploadPath(relative));
  } catch {
    // ignore missing
  }
}

export async function uploadExists(relativePath: string): Promise<boolean> {
  try {
    if (isBlobStorageEnabled()) {
      const result = await get(assertRelativeUploadPath(relativePath).relative, {
        access: "private",
      });
      return Boolean(result && result.statusCode === 200);
    }
    await access(resolveUploadPath(relativePath));
    return true;
  } catch {
    return false;
  }
}
