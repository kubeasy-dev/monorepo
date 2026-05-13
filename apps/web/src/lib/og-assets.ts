import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let fontCache: ArrayBuffer | null = null;
let logoCache: string | null = null;

function findAssetPath(filename: string, subfolder = ""): string {
  // Production (Nitro node-server): assets are in the built public directory
  const prodPath = join(
    process.cwd(),
    ".output",
    "public",
    subfolder,
    filename,
  );
  if (existsSync(prodPath)) return prodPath;
  // Development (vite dev): assets are in the source public directory
  return join(process.cwd(), "public", subfolder, filename);
}

export async function getGeistFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const fontPath = findAssetPath("geist.ttf", "fonts");
  const data = await readFile(fontPath);
  fontCache = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  return fontCache;
}

export async function getLogoData(): Promise<string> {
  if (logoCache) return logoCache;
  const logoPath = findAssetPath("logo.png");
  const data = await readFile(logoPath);
  logoCache = `data:image/png;base64,${data.toString("base64")}`;
  return logoCache;
}
