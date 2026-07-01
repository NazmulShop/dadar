import type { Env } from "../env";
import { generateId } from "./ids";
import { getDb, uploadsTable } from "../db";
import { eq } from "drizzle-orm";

/**
 * R2 upload helper — replaces Cloudinary while preserving the wire shape
 *   { url, publicId, width, height }
 * the frontend admin product editor consumes.
 *
 * Free-plan note: R2 is not available on the Cloudflare Workers free plan.
 * When the `UPLOADS` binding is absent, the same wire shape is produced by
 * storing the image as base64 directly in D1 (`uploadsTable`) instead, and
 * `/api/uploads/raw/:key` serves it back out. This keeps the upload feature
 * fully functional on the free plan with zero extra paid resources. The cap
 * below (`D1_FALLBACK_MAX_BYTES`) keeps each row safely under D1's per-row
 * size limit — large uploads still require upgrading to R2.
 *
 * Strategy:
 *   - `data:` URI → decode base64 → R2.put (or D1 fallback) with the declared
 *     content-type.
 *   - `https://` URL → fetch then stream into R2 (or D1 fallback).
 *   - Image dimensions parsed from raw bytes (pure JS, no WASM needed):
 *       PNG  → IHDR chunk at offset 16
 *       JPEG → first SOF0/SOF1/SOF2 marker
 *       WebP → VP8/VP8L/VP8X chunk header
 *       GIF  → logical screen descriptor
 */
const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif|avif|svg\+xml)$/i;

// D1 row-size safety margin (D1 enforces a hard ~2 MB row limit). Base64
// inflates bytes by ~4/3, so this caps the *encoded* uploaded image around
// ~750 KB raw — generous for product thumbnails/avatars on the free plan.
const D1_FALLBACK_MAX_BYTES = 750_000;

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

// ── Pure-JS image dimension parsers ──────────────────────────────────────────

function readU32BE(b: Uint8Array, o: number): number {
  return ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
}
function readU16BE(b: Uint8Array, o: number): number {
  return ((b[o]! << 8) | b[o + 1]!) >>> 0;
}
function readU16LE(b: Uint8Array, o: number): number {
  return (b[o]! | (b[o + 1]! << 8)) >>> 0;
}
function readU24LE(b: Uint8Array, o: number): number {
  return (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16)) >>> 0;
}
function ascii(b: Uint8Array, o: number, n: number): string {
  return String.fromCharCode(...b.slice(o, o + n));
}

function parsePng(b: Uint8Array): { w: number; h: number } {
  // PNG sig (8) + IHDR length (4) + "IHDR" (4) + width (4) + height (4)
  if (b.length < 24) return { w: 0, h: 0 };
  if (b[0] !== 0x89 || ascii(b, 1, 3) !== "PNG") return { w: 0, h: 0 };
  return { w: readU32BE(b, 16), h: readU32BE(b, 20) };
}

function parseJpeg(b: Uint8Array): { w: number; h: number } {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return { w: 0, h: 0 };
  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1]!;
    const len = readU16BE(b, i + 2);
    // SOF0, SOF1, SOF2 (progressive) markers
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (i + 8 < b.length) {
        return { w: readU16BE(b, i + 7), h: readU16BE(b, i + 5) };
      }
    }
    i += 2 + len;
  }
  return { w: 0, h: 0 };
}

function parseWebp(b: Uint8Array): { w: number; h: number } {
  if (b.length < 30) return { w: 0, h: 0 };
  if (ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return { w: 0, h: 0 };
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8 " && b.length >= 30) {
    // Lossy: bits 0–13 of bytes 26–27 = width-1, bits 0–13 of bytes 28–29 = height-1
    const w = (readU16LE(b, 26) & 0x3fff) + 1;
    const h = (readU16LE(b, 28) & 0x3fff) + 1;
    return { w, h };
  }
  if (chunk === "VP8X" && b.length >= 34) {
    // Extended: 3-byte LE canvas width-1 at 24, height-1 at 27
    return { w: readU24LE(b, 24) + 1, h: readU24LE(b, 27) + 1 };
  }
  // VP8L (lossless) — bitstream parsing is complex; skip
  return { w: 0, h: 0 };
}

function parseGif(b: Uint8Array): { w: number; h: number } {
  if (b.length < 10) return { w: 0, h: 0 };
  if (ascii(b, 0, 3) !== "GIF") return { w: 0, h: 0 };
  return { w: readU16LE(b, 6), h: readU16LE(b, 8) };
}

function getImageDimensions(
  bytes: Uint8Array,
  contentType: string,
): { width: number; height: number } {
  const ct = contentType.toLowerCase();
  let result = { w: 0, h: 0 };
  if (ct.includes("png")) result = parsePng(bytes);
  else if (ct.includes("jpeg") || ct.includes("jpg")) result = parseJpeg(bytes);
  else if (ct.includes("webp")) result = parseWebp(bytes);
  else if (ct.includes("gif")) result = parseGif(bytes);
  // AVIF / SVG: complex binary/text parsing — return 0
  return { width: result.w, height: result.h };
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function buildUrl(env: Env, key: string): string {
  if (env.IMAGE_CDN_BASE) {
    const base = env.IMAGE_CDN_BASE.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(base)) {
      throw new Error("IMAGE_CDN_BASE must be an absolute http(s) URL");
    }
    if (env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(base)) {
      throw new Error("IMAGE_CDN_BASE points at localhost in production");
    }
    return `${base}/${key}`;
  }
  const appBase = (env.APP_URL || "").replace(/\/+$/, "");
  if (!appBase || !/^https?:\/\//i.test(appBase)) {
    throw new Error(
      "Cannot build upload URL: set IMAGE_CDN_BASE or APP_URL to an absolute http(s) URL",
    );
  }
  if (env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(appBase)) {
    throw new Error(
      "APP_URL points at localhost in production — set IMAGE_CDN_BASE or a real APP_URL",
    );
  }
  return `${appBase}/api/uploads/raw/${encodeURIComponent(key)}`;
}

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("avif")) return "avif";
  if (m.includes("svg")) return "svg";
  return "bin";
}

// ── Public API ────────────────────────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function uploadImage(
  env: Env,
  source: string,
  opts: { folder?: string } = {},
): Promise<UploadResult> {
  let bytes: Uint8Array;
  let contentType: string;

  if (source.startsWith("data:")) {
    const match = source.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URI");
    contentType = match[1]!;
    if (!ALLOWED_MIME.test(contentType)) {
      throw new Error(`Unsupported MIME type: ${contentType}`);
    }
    const bin = atob(match[2]!);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else if (/^https:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    contentType = res.headers.get("content-type") || "application/octet-stream";
    if (!ALLOWED_MIME.test(contentType)) {
      throw new Error(`Unsupported MIME type: ${contentType}`);
    }
    bytes = new Uint8Array(await res.arrayBuffer());
  } else {
    throw new Error("source must be a base64 data URI or https URL");
  }

  const { width, height } = getImageDimensions(bytes, contentType);

  const folder = (opts.folder ?? "dadar-shop").replace(/^\/+|\/+$/g, "");
  const key = `${folder}/${generateId()}.${extFromMime(contentType)}`;

  if (env.UPLOADS) {
    await env.UPLOADS.put(key, bytes, { httpMetadata: { contentType } });
  } else {
    // Free-plan fallback — store in D1 instead of R2.
    if (bytes.length > D1_FALLBACK_MAX_BYTES) {
      throw new Error(
        `Image too large for free-plan storage (max ${Math.floor(D1_FALLBACK_MAX_BYTES / 1024)} KB without R2). ` +
          "Upgrade to the Workers Paid plan and bind R2 for larger uploads.",
      );
    }
    await getDb(env)
      .insert(uploadsTable)
      .values({
        key,
        contentType,
        dataBase64: bytesToBase64(bytes),
        width,
        height,
      });
  }

  return {
    url: buildUrl(env, key),
    publicId: key,
    width,
    height,
  };
}

export async function deleteImage(env: Env, publicId: string): Promise<void> {
  if (env.UPLOADS) {
    await env.UPLOADS.delete(publicId);
    return;
  }
  await getDb(env).delete(uploadsTable).where(eq(uploadsTable.key, publicId));
}

/**
 * Reads back an upload stored via the D1 fallback path. Used by the
 * `/api/uploads/raw/:key` route when no R2 binding is present.
 */
export async function getD1Upload(
  env: Env,
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const rows = await getDb(env)
    .select({ contentType: uploadsTable.contentType, dataBase64: uploadsTable.dataBase64 })
    .from(uploadsTable)
    .where(eq(uploadsTable.key, key))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const bin = atob(row.dataBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType: row.contentType };
}

export function isUploadsConfigured(_env: Env): boolean {
  // Always true: R2 when bound, D1 fallback otherwise — upload endpoint
  // stays functional on the free plan.
  return true;
}
