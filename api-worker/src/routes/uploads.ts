/**
 * Uploads — R2 port of Cloudinary. Same wire shape.
 *   POST   /api/uploads/image            (auth: any user)
 *   DELETE /api/uploads/image/:publicId  (auth: admin / seller)
 *   GET    /api/uploads/raw/:key         (public CDN fallback)
 */
import { Hono } from "hono";
import { z } from "zod";
import type { Env, Variables } from "../env";
import { requireAuth } from "../middleware/auth";
import { uploadImage, deleteImage, isUploadsConfigured, getD1Upload } from "../lib/r2";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const uploadSchema = z.object({
  source: z
    .string()
    .min(10)
    .max(15_000_000)
    .refine(
      (s) =>
        /^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml);base64,/.test(s) ||
        /^https:\/\//.test(s),
      { message: "source must be a base64 image data URI or https URL" },
    ),
  folder: z.string().max(120).optional(),
});

app.post("/image", requireAuth(), async (c) => {
  if (!isUploadsConfigured(c.env)) {
    return c.json({ error: "Image storage is not configured on the server." }, 503);
  }
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  try {
    const result = await uploadImage(c.env, parsed.data.source, {
      folder: parsed.data.folder ?? `dadar-shop/${user.role}/${user.id}`,
    });
    return c.json(result);
  } catch (err) {
    return c.json({ error: "Upload failed", detail: String(err) }, 500);
  }
});

app.delete("/image/:publicId", requireAuth(), async (c) => {
  const user = c.get("user")!;
  if (user.role !== "admin" && user.role !== "seller") {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    await deleteImage(c.env, decodeURIComponent(c.req.param("publicId")));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: "Delete failed", detail: String(err) }, 500);
  }
});

// Public CDN fallback — only used when IMAGE_CDN_BASE is not configured.
app.get("/raw/:key{.+}", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));

  if (!c.env.UPLOADS) {
    // Free-plan fallback — image bytes live in D1, not R2.
    const found = await getD1Upload(c.env, key);
    if (!found) return c.notFound();
    return new Response(found.bytes, {
      headers: {
        "content-type": found.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  const obj = await c.env.UPLOADS.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});

export default app;
