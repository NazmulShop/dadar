/**
 * Public shop routes — no authentication required.
 *
 * Routes mounted at /api/shop/:
 *   GET  /products         List active products with filter/sort/pagination
 *   GET  /products/:id     Single product detail
 */
import { Hono } from "hono";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Env, Variables } from "../env";
import { getDb, productsTable, reviewsTable } from "../db";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const PAGE_SIZE = 8;

/* ──────────── GET /api/shop/products ──────────── */
app.get("/products", async (c) => {
  const db = getDb(c.env);

  const q = c.req.query("q")?.trim() ?? "";
  const category = c.req.query("category")?.toLowerCase() ?? "all";
  const subcategory = c.req.query("subcategory") ?? "All";
  const brands = (c.req.query("brands") ?? "").split(",").filter(Boolean);
  const priceMin = parseInt(c.req.query("priceMin") ?? "0") || 0;
  const priceMax = parseInt(c.req.query("priceMax") ?? "999999") || 999999;
  const minRating = parseFloat(c.req.query("minRating") ?? "0") || 0;
  const sort = c.req.query("sort") ?? "popular";
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1") || 1);

  let rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.status, "active"));

  // In-memory filters (SQLite free plan — avoid complex queries)
  const qTokens = q ? q.toLowerCase().split(/[\s,]+/).filter(Boolean) : [];

  let filtered = rows.filter((p) => {
    if (category !== "all" && p.categorySlug.toLowerCase() !== category) return false;
    if (subcategory !== "All" && p.subcategory !== subcategory) return false;
    if (brands.length > 0 && !brands.includes(p.brandName)) return false;
    if (p.price < priceMin || p.price > priceMax) return false;
    if (p.rating < minRating) return false;
    if (qTokens.length > 0) {
      const hay = `${p.name} ${p.brandName} ${p.subcategory ?? ""} ${p.categorySlug} ${p.sellerName ?? ""}`.toLowerCase();
      for (const t of qTokens) if (!hay.includes(t)) return false;
    }
    return true;
  });

  filtered = filtered.slice().sort((a, b) => {
    switch (sort) {
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      case "rating": return b.rating - a.rating;
      case "newest": return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
      case "popular":
      default: return b.reviewCount - a.reviewCount;
    }
  });

  const total = filtered.length;
  const start = (page - 1) * PAGE_SIZE;
  const items = filtered.slice(start, start + PAGE_SIZE);

  return c.json({ items, total, page, pageSize: PAGE_SIZE });
});

/* ──────────── GET /api/shop/products/:id ──────────── */
app.get("/products/:id", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");

  const rows = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.status, "active")))
    .limit(1);

  if (!rows[0]) return c.json({ error: "Product not found" }, 404);

  // Fetch published reviews for this product
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.productId, id), eq(reviewsTable.status, "Published")))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(20);

  return c.json({ product: rows[0], reviews });
});

/* ──────────── GET /api/shop/categories ──────────── */
app.get("/categories", async (c) => {
  const db = getDb(c.env);
  const rows = await db
    .select({ categorySlug: productsTable.categorySlug, subcategory: productsTable.subcategory })
    .from(productsTable)
    .where(eq(productsTable.status, "active"));

  const catMap = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!catMap.has(r.categorySlug)) catMap.set(r.categorySlug, new Set());
    if (r.subcategory) catMap.get(r.categorySlug)!.add(r.subcategory);
  }

  const categories = Array.from(catMap.entries()).map(([slug, subs]) => ({
    slug,
    subcategories: Array.from(subs),
  }));

  return c.json({ categories });
});

/* ──────────── GET /api/shop/reviews ──────────── */
app.get("/reviews", async (c) => {
  const db = getDb(c.env);
  const limit = Math.min(20, parseInt(c.req.query("limit") ?? "6") || 6);

  const reviews = await db
    .select({
      id: reviewsTable.id,
      authorName: reviewsTable.authorName,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      productId: reviewsTable.productId,
      status: reviewsTable.status,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.status, "Published")))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limit);

  // Attach product names
  const productIds = [...new Set(reviews.map((r) => r.productId).filter(Boolean))];
  let productMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const products = await db
      .select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable);
    for (const p of products) productMap[p.id] = p.name;
  }

  return c.json(
    reviews.map((r) => ({
      ...r,
      productName: r.productId ? productMap[r.productId] : undefined,
    }))
  );
});

export default app;
