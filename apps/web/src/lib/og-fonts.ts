import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let fontCache: ArrayBuffer | null = null;

function findFontPath(filename: string): string {
  // Production (Nitro node-server): font is in the built public directory
  const prodPath = join(process.cwd(), ".output", "public", "fonts", filename);
  if (existsSync(prodPath)) return prodPath;
  // Development (vite dev): font is in the source public directory
  return join(process.cwd(), "public", "fonts", filename);
}

export async function getGeistFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const fontPath = findFontPath("geist.ttf");
  const data = await readFile(fontPath);
  fontCache = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  return fontCache;
}
