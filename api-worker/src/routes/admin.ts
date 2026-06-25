/**
 * Admin core — full port of `api-server/src/routes/admin.ts` (~554 lines).
 *
 * Mounted at /api/admin (alongside the admin-management router). All paths,
 * methods, request bodies, response shapes, and status codes match Express.
 *
 * Notes for parity:
 *   - The middleware here enforces strict role === "admin" (Express did the
 *     same). The shared `requireAdmin()` middleware also accepts moderators,
 *     so this file uses a local stricter gate.
 *   - Order status updates and review state changes still broadcast over the
 *     AdminHub Durable Object via `lib/broadcast.ts`.
 */
import { Hono } from "hono";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Env, Variables } from "../env";
import { requireAuth } from "../middleware/auth";
import { generateId } from "../lib/ids";
import { broadcastOrderUpdate, broadcastReviewPending } from "../lib/broadcast";
import { logger } from "../lib/logger";
import {
  getDb,
  usersTable,
  productsTable,
  categoriesTable,
  brandsTable,
  inventoryTable,
  ordersTable,
  orderItemsTable,
  refundsTable,
  sellersTable,
  reviewsTable,
} from "../db";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Strict admin gate (Express required role==="admin" exactly; the shared
// `requireAdmin()` middleware also accepts moderators, so we re-check here).
app.use("*", requireAuth(), async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

/* ─────────────── Seed (commerce baseline) ─────────────── */

async function ensureSeeded(env: Env): Promise<void> {
  const db = getDb(env);
  const existing = await db.select({ count: count() }).from(productsTable);
  if ((existing[0]?.count ?? 0) > 0) return;

  const catData = [
    { id: "cat-electronics", slug: "electronics", label: "Electronics", subcategories: ["All", "Headphones", "Watches", "Speakers", "Cameras"], sortOrder: 1 },
    { id: "cat-fashion", slug: "fashion", label: "Fashion", subcategories: ["All", "Sharee", "Sneakers", "Knitwear", "Eyewear"], sortOrder: 2 },
    { id: "cat-bags", slug: "bags", label: "Bags", subcategories: ["All", "Tote", "Crossbody", "Backpack"], sortOrder: 3 },
    { id: "cat-beauty", slug: "beauty", label: "Beauty", subcategories: ["All", "Skincare", "Fragrance", "Hair"], sortOrder: 4 },
    { id: "cat-weddings", slug: "weddings", label: "Weddings", subcategories: ["All", "Bridal", "Groom", "Gifts"], sortOrder: 5 },
    { id: "cat-watches", slug: "watches", label: "Watches", subcategories: ["All", "Analog", "Smart", "Vintage"], sortOrder: 6 },
  ];
  await db.insert(categoriesTable).values(catData).onConflictDoNothing();

  const brandData = [
    { id: "brand-1", name: "Maison Dhaka" },
    { id: "brand-2", name: "Tempora Studio" },
    { id: "brand-3", name: "Acoustica BD" },
    { id: "brand-4", name: "Pace & Co." },
    { id: "brand-5", name: "Mira Beauty" },
    { id: "brand-6", name: "Oat & Wool" },
    { id: "brand-7", name: "Lensoria" },
  ];
  await db.insert(brandsTable).values(brandData).onConflictDoNothing();

  const productData = [
    { id: "1", name: "Onyx Analog Watch", categorySlug: "watches", subcategory: "Analog", brandName: "Tempora Studio", sellerName: "Tempora Studio", price: 4290, originalPrice: 6900, rating: 4.8, reviewCount: 312, badge: "Bestseller", status: "active" as const },
    { id: "2", name: "Emerald Leather Tote", categorySlug: "bags", subcategory: "Tote", brandName: "Maison Dhaka", sellerName: "Maison Dhaka", price: 7850, originalPrice: 9800, rating: 4.9, reviewCount: 184, status: "active" as const },
    { id: "3", name: "Over-Ear Headphones", categorySlug: "electronics", subcategory: "Headphones", brandName: "Acoustica BD", sellerName: "Acoustica BD", price: 5490, originalPrice: 7200, rating: 4.7, reviewCount: 1042, badge: "Flash Deal", status: "active" as const },
    { id: "4", name: "Cloud Runner Sneakers", categorySlug: "fashion", subcategory: "Sneakers", brandName: "Pace & Co.", sellerName: "Pace & Co.", price: 3990, rating: 4.6, reviewCount: 271, status: "active" as const },
    { id: "5", name: "Banarasi Silk Saree", categorySlug: "fashion", subcategory: "Sharee", brandName: "Maison Dhaka", sellerName: "Maison Dhaka", price: 8900, originalPrice: 12000, rating: 4.9, reviewCount: 612, status: "active" as const },
    { id: "6", name: "Hydration Skincare Trio", categorySlug: "beauty", subcategory: "Skincare", brandName: "Mira Beauty", sellerName: "Mira Beauty", price: 3290, originalPrice: 4900, rating: 4.9, reviewCount: 421, status: "active" as const },
    { id: "7", name: "Cashmere Knit Sweater", categorySlug: "fashion", subcategory: "Knitwear", brandName: "Oat & Wool", sellerName: "Oat & Wool", price: 4650, originalPrice: 6200, rating: 4.8, reviewCount: 308, status: "active" as const },
    { id: "8", name: "Tortoise Sunglasses", categorySlug: "fashion", subcategory: "Eyewear", brandName: "Lensoria", sellerName: "Lensoria", price: 2190, originalPrice: 3500, rating: 4.6, reviewCount: 188, status: "active" as const },
    { id: "9", name: "Minimal Steel Watch", categorySlug: "watches", subcategory: "Analog", brandName: "Tempora Studio", sellerName: "Tempora Studio", price: 5290, originalPrice: 7900, rating: 4.7, reviewCount: 142, status: "active" as const },
    { id: "10", name: "Studio Wireless Cans", categorySlug: "electronics", subcategory: "Headphones", brandName: "Acoustica BD", sellerName: "Acoustica BD", price: 7990, rating: 4.8, reviewCount: 521, badge: "Pro pick", status: "active" as const },
    { id: "11", name: "Crossbody Leather Bag", categorySlug: "bags", subcategory: "Crossbody", brandName: "Maison Dhaka", sellerName: "Maison Dhaka", price: 5290, originalPrice: 6900, rating: 4.5, reviewCount: 96, status: "active" as const },
    { id: "12", name: "Cream Runner Sneakers", categorySlug: "fashion", subcategory: "Sneakers", brandName: "Pace & Co.", sellerName: "Pace & Co.", price: 4290, rating: 4.4, reviewCount: 78, status: "active" as const },
    { id: "13", name: "Aurora Serum Set", categorySlug: "beauty", subcategory: "Skincare", brandName: "Mira Beauty", sellerName: "Mira Beauty", price: 4890, originalPrice: 6200, rating: 4.9, reviewCount: 233, badge: "New", status: "active" as const },
    { id: "14", name: "Oat Cardigan", categorySlug: "fashion", subcategory: "Knitwear", brandName: "Oat & Wool", sellerName: "Oat & Wool", price: 5290, rating: 4.7, reviewCount: 51, status: "active" as const },
    { id: "15", name: "Round Tortoise Frames", categorySlug: "fashion", subcategory: "Eyewear", brandName: "Lensoria", sellerName: "Lensoria", price: 2890, rating: 4.6, reviewCount: 64, status: "active" as const },
    { id: "16", name: "Wedding Silk Saree", categorySlug: "weddings", subcategory: "Bridal", brandName: "Maison Dhaka", sellerName: "Maison Dhaka", price: 14900, originalPrice: 18900, rating: 5.0, reviewCount: 88, badge: "Limited", status: "active" as const },
    { id: "17", name: "Bridal Gift Set", categorySlug: "weddings", subcategory: "Gifts", brandName: "Mira Beauty", sellerName: "Mira Beauty", price: 6290, rating: 4.8, reviewCount: 27, status: "active" as const },
    { id: "18", name: "Vintage Field Watch", categorySlug: "watches", subcategory: "Vintage", brandName: "Tempora Studio", sellerName: "Tempora Studio", price: 6490, originalPrice: 8200, rating: 4.7, reviewCount: 102, status: "active" as const },
    { id: "19", name: "Travel Backpack", categorySlug: "bags", subcategory: "Backpack", brandName: "Pace & Co.", sellerName: "Pace & Co.", price: 4990, rating: 4.5, reviewCount: 312, status: "active" as const },
    { id: "20", name: "Glow Serum", categorySlug: "beauty", subcategory: "Skincare", brandName: "Mira Beauty", sellerName: "Mira Beauty", price: 2490, originalPrice: 3200, rating: 4.8, reviewCount: 156, status: "active" as const },
  ];
  await db.insert(productsTable).values(productData).onConflictDoNothing();

  for (const p of productData) {
    const stock = 100; // default initial stock
    const reserved = 0;
    await db.insert(inventoryTable).values({
      id: `inv-${p.id}`,
      productId: p.id,
      onHand: stock,
      reserved,
      reorderAt: 15,
    }).onConflictDoNothing();
  }

  // NOTE: Fake orders, refunds, sellers, and reviews are NOT seeded.
  // All such data must be created through real user actions or the admin panel.
}

app.use("*", async (c, next) => {
  c.executionCtx.waitUntil(
    ensureSeeded(c.env).catch((err) =>
      logger.warn({ err: String(err) }, "admin seed failed"),
    ),
  );
  await next();
});

/* ─────────────── Dashboard ─────────────── */

app.get("/dashboard", async (c) => {
  const db = getDb(c.env);
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.placedAt)).limit(20);
  const allProducts = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.status, "active"))
    .orderBy(asc(productsTable.id));

  const now = new Date();
  const revenueSeries: number[] = [];
  const ordersSeries: number[] = [];
  const months: string[] = [];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(MONTH_NAMES[d.getMonth()]!);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthOrders = orders.filter(
      (o) => o.placedAt! >= start && o.placedAt! <= end && o.status !== "Cancelled",
    );
    revenueSeries.push(monthOrders.reduce((s, o) => s + o.total, 0));
    ordersSeries.push(monthOrders.length);
  }

  const statusTotals: Record<string, number> = {};
  for (const o of orders) statusTotals[o.status] = (statusTotals[o.status] ?? 0) + 1;

  const totalCustomers = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "user"));

  return c.json({
    orders,
    allProducts,
    months,
    revenueSeries,
    ordersSeries,
    statusTotals,
    totalCustomers: Number(totalCustomers[0]?.count ?? 0),
  });
});

/* ─────────────── Products ─────────────── */

app.get("/products", async (c) => {
  const db = getDb(c.env);
  const products = await db.select().from(productsTable).orderBy(asc(productsTable.id));
  return c.json(products);
});

app.post("/products", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    name: z.string().min(1),
    categorySlug: z.string(),
    subcategory: z.string().optional(),
    brandName: z.string(),
    price: z.number().int().positive(),
    originalPrice: z.number().int().optional(),
    badge: z.string().optional(),
    description: z.string().optional(),
    stock: z.number().int().min(0).optional(),
    status: z.enum(["active", "draft", "archived"]).optional(),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const { stock, ...productFields } = parsed.data;
  const id = generateId();
  const db = getDb(c.env);
  await db.insert(productsTable).values({ id, ...productFields, status: productFields.status ?? "active" });
  await db.insert(inventoryTable).values({
    id: `inv-${id}`,
    productId: id,
    onHand: stock ?? 0,
    reserved: 0,
    reorderAt: 15,
  });
  const product = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  return c.json(product[0]);
});

app.put("/products/:id", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    name: z.string().optional(),
    categorySlug: z.string().optional(),
    subcategory: z.string().nullable().optional(),
    brandName: z.string().optional(),
    price: z.number().int().optional(),
    originalPrice: z.number().int().nullable().optional(),
    badge: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    stock: z.number().int().min(0).optional(),
    status: z.enum(["active", "draft", "archived"]).optional(),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const { stock, ...productFields } = parsed.data;
  const db = getDb(c.env);
  await db
    .update(productsTable)
    .set({ ...productFields, updatedAt: new Date() })
    .where(eq(productsTable.id, id));

  if (stock !== undefined) {
    await db
      .update(inventoryTable)
      .set({ onHand: stock, updatedAt: new Date() })
      .where(eq(inventoryTable.productId, id));
  }

  const product = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  return c.json(product[0] ?? { error: "Not found" });
});

app.delete("/products/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const existing = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!existing.length) return c.json({ error: "Not found" }, 404);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  // inventoryTable has onDelete: "cascade" on productId, so its row goes too.
  return c.json({ ok: true });
});

/* ─────────────── Categories ─────────────── */

app.get("/categories", async (c) => {
  const db = getDb(c.env);
  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.sortOrder));
  const products = await db
    .select({ categorySlug: productsTable.categorySlug })
    .from(productsTable);
  const countMap: Record<string, number> = {};
  for (const p of products) countMap[p.categorySlug] = (countMap[p.categorySlug] ?? 0) + 1;
  return c.json(categories.map((cat) => ({ ...cat, productCount: countMap[cat.slug] ?? 0 })));
});

/* ─────────────── Brands ─────────────── */

app.get("/brands", async (c) => {
  const db = getDb(c.env);
  const brands = await db.select().from(brandsTable).orderBy(asc(brandsTable.name));
  const products = await db
    .select({ brandName: productsTable.brandName, categorySlug: productsTable.categorySlug })
    .from(productsTable);
  return c.json(
    brands.map((b) => {
      const bp = products.filter((p) => p.brandName === b.name);
      const cats = bp.reduce<Record<string, number>>((acc, p) => {
        acc[p.categorySlug] = (acc[p.categorySlug] ?? 0) + 1;
        return acc;
      }, {});
      const topCat = Object.entries(cats).sort((a, b2) => b2[1] - a[1])[0]?.[0] ?? "—";
      return { ...b, productCount: bp.length, topCategory: topCat };
    }),
  );
});

/* ─────────────── Inventory ─────────────── */

app.get("/inventory", async (c) => {
  const db = getDb(c.env);
  const rows = await db
    .select({ product: productsTable, inventory: inventoryTable })
    .from(inventoryTable)
    .innerJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
    .orderBy(asc(productsTable.id));
  return c.json(
    rows.map((r) => ({
      productId: r.product.id,
      productName: r.product.name,
      price: r.product.price,
      onHand: r.inventory.onHand,
      reserved: r.inventory.reserved,
      available: Math.max(r.inventory.onHand - r.inventory.reserved, 0),
      reorderAt: r.inventory.reorderAt,
      status:
        r.inventory.onHand === 0
          ? "Out"
          : r.inventory.onHand < r.inventory.reorderAt
          ? "Low"
          : "OK",
    })),
  );
});

app.put("/inventory/:productId", async (c) => {
  const productId = c.req.param("productId");
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    onHand: z.number().int().min(0).optional(),
    reserved: z.number().int().min(0).optional(),
    reorderAt: z.number().int().min(0).optional(),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const db = getDb(c.env);
  await db
    .update(inventoryTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(inventoryTable.productId, productId));
  return c.json({ ok: true });
});

/* ─────────────── Orders ─────────────── */

app.get("/orders", async (c) => {
  const db = getDb(c.env);
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.placedAt));
  const items = await db.select().from(orderItemsTable);
  const itemsByOrder: Record<string, typeof items> = {};
  for (const item of items) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId]!.push(item);
  }
  return c.json(orders.map((o) => ({ ...o, items: itemsByOrder[o.id] ?? [] })));
});

app.put("/orders/:id/status", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    status: z.enum([
      "Placed", "Processing", "Packed", "Shipped",
      "Out for delivery", "Delivered", "Cancelled", "Returned",
    ]),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const db = getDb(c.env);
  await db
    .update(ordersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(ordersTable.id, id));
  const updated = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (updated[0]) {
    c.executionCtx.waitUntil(
      broadcastOrderUpdate(
        c.env,
        id,
        parsed.data.status,
        updated[0].customerName ?? "Customer",
        updated[0].total,
      ),
    );
  }
  return c.json({ ok: true });
});

app.get("/refunds", async (c) => {
  const db = getDb(c.env);
  const refunds = await db.select().from(refundsTable).orderBy(desc(refundsTable.createdAt));
  return c.json(refunds);
});

/* ─────────────── Customers ─────────────── */

app.get("/customers", async (c) => {
  const db = getDb(c.env);
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "user"))
    .orderBy(desc(usersTable.createdAt));
  const orders = await db
    .select({
      customerId: ordersTable.customerId,
      total: ordersTable.total,
      placedAt: ordersTable.placedAt,
      id: ordersTable.id,
    })
    .from(ordersTable);

  const ordersByUser: Record<string, { count: number; spend: number; lastOrder: string }> = {};
  for (const o of orders) {
    const uid = o.customerId ?? "";
    if (!ordersByUser[uid]) ordersByUser[uid] = { count: 0, spend: 0, lastOrder: "" };
    ordersByUser[uid].count++;
    ordersByUser[uid].spend += o.total;
    const iso = o.placedAt!.toISOString();
    if (!ordersByUser[uid].lastOrder || iso > ordersByUser[uid].lastOrder) {
      ordersByUser[uid].lastOrder = iso.slice(0, 10);
    }
  }

  const seedCustomers = [
    { id: "CUST-1001", name: "Arif Hossain", email: "arif.hossain@example.com", phone: "+8801711-234567", tier: "Gold", orders: 24, spend: 84500, points: 1820, supportTickets: 3, lastOrder: "2026-06-12" },
    { id: "CUST-1002", name: "Sumaiya Akter", email: "sumaiya.a@example.com", phone: "+8801812-987654", tier: "Platinum", orders: 41, spend: 192300, points: 4150, supportTickets: 5, lastOrder: "2026-06-14" },
    { id: "CUST-1003", name: "Rakib Khan", email: "rakib.k@example.com", phone: "+8801933-112233", tier: "Silver", orders: 6, spend: 18420, points: 320, supportTickets: 1, lastOrder: "2026-05-30" },
    { id: "CUST-1004", name: "Nusrat Jahan", email: "nusrat.j@example.com", phone: "+8801511-445566", tier: "Gold", orders: 17, spend: 62100, points: 1240, supportTickets: 2, lastOrder: "2026-06-10" },
    { id: "CUST-1005", name: "Mahmud Sarker", email: "mahmud.s@example.com", phone: "+8801611-778899", tier: "Silver", orders: 3, spend: 7820, points: 95, supportTickets: 0, lastOrder: "2026-04-22" },
  ];

  const dbCustomers = users.map((u) => {
    const stats = ordersByUser[u.id] ?? { count: 0, spend: 0, lastOrder: "" };
    const tier = stats.spend > 100000 ? "Platinum" : stats.spend > 30000 ? "Gold" : "Silver";
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      tier,
      orders: stats.count,
      spend: stats.spend,
      points: Math.floor(stats.spend / 50),
      supportTickets: 0,
      lastOrder: stats.lastOrder,
    };
  });

  return c.json([...seedCustomers, ...dbCustomers]);
});

/* ─────────────── Sellers ─────────────── */

app.get("/sellers", async (c) => {
  const db = getDb(c.env);
  const sellers = await db.select().from(sellersTable).orderBy(desc(sellersTable.createdAt));
  return c.json(sellers);
});

app.put("/sellers/:id/status", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    status: z.enum(["Pending", "Active", "Suspended"]),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const db = getDb(c.env);
  await db
    .update(sellersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(sellersTable.id, id));
  return c.json({ ok: true });
});

app.put("/sellers/:id/commission", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    commission: z.number().int().min(0).max(50),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const db = getDb(c.env);
  await db
    .update(sellersTable)
    .set({ commission: parsed.data.commission, updatedAt: new Date() })
    .where(eq(sellersTable.id, id));
  return c.json({ ok: true });
});

app.post("/sellers/:id/payout", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db
    .update(sellersTable)
    .set({ pendingPayout: 0, updatedAt: new Date() })
    .where(eq(sellersTable.id, id));
  return c.json({ ok: true });
});

app.post("/sellers/register", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    shop: z.string().min(1),
    owner: z.string().min(1),
    email: z.string().email(),
    phone: z.string(),
    tradeLicense: z.string().optional(),
    nid: z.string().optional(),
    address: z.string().optional(),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const id = `VEN-${String(Date.now()).slice(-6)}`;
  const db = getDb(c.env);
  await db.insert(sellersTable).values({
    id,
    shop: parsed.data.shop,
    owner: parsed.data.owner,
    email: parsed.data.email,
    phone: parsed.data.phone,
    status: "Pending",
    commission: 12,
  });
  return c.json({ ok: true, id });
});

/* ─────────────── Reviews ─────────────── */

app.get("/reviews", async (c) => {
  const db = getDb(c.env);
  const reviews = await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  return c.json(reviews);
});

app.put("/reviews/:id/status", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    status: z.enum(["Pending", "Published", "Rejected", "Reported"]),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const db = getDb(c.env);
  await db
    .update(reviewsTable)
    .set({ status: parsed.data.status })
    .where(eq(reviewsTable.id, id));
  if (parsed.data.status === "Pending") {
    const rev = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    if (rev[0]) {
      c.executionCtx.waitUntil(
        broadcastReviewPending(c.env, id, rev[0].productName, rev[0].authorName, rev[0].rating),
      );
    }
  }
  return c.json({ ok: true });
});

/* ─────────────── Analytics ─────────────── */

app.get("/analytics", async (c) => {
  const db = getDb(c.env);
  const now = new Date();
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months: string[] = [];
  const revenueSeries: number[] = [];
  const ordersSeries: number[] = [];

  const allOrders = await db
    .select({
      total: ordersTable.total,
      placedAt: ordersTable.placedAt,
      status: ordersTable.status,
    })
    .from(ordersTable);

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(MONTH_NAMES[d.getMonth()]!);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthOrders = allOrders.filter(
      (o) => o.placedAt! >= start && o.placedAt! <= end && o.status !== "Cancelled",
    );
    revenueSeries.push(monthOrders.reduce((s, o) => s + o.total, 0));
    ordersSeries.push(monthOrders.length);
  }

  const totalRevenue = revenueSeries.reduce((a, b) => a + b, 0);
  const bestMonth = Math.max(...revenueSeries);
  const avgMonthly = Math.round(totalRevenue / revenueSeries.length);

  const productCount = await db.select({ count: count() }).from(productsTable);
  const customerCount = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "user"));
  const inventoryRows = await db.select().from(inventoryTable);
  const lowStock = inventoryRows.filter((r) => r.onHand > 0 && r.onHand < r.reorderAt).length;
  const avgRating = await db
    .select({ avg: sql<number>`AVG(${productsTable.rating})` })
    .from(productsTable);

  return c.json({
    months,
    revenueSeries,
    ordersSeries,
    totalRevenue,
    bestMonth,
    avgMonthly,
    productCount: Number(productCount[0]?.count ?? 0),
    customerCount: Number(customerCount[0]?.count ?? 0),
    lowStock,
    avgRating: Number(avgRating[0]?.avg ?? 0).toFixed(1),
  });
});

/* ─────────────── Delivery Stats ─────────────── */

app.get("/delivery-stats", async (c) => {
  const db = getDb(c.env);

  const allOrders = await db
    .select({
      courier: ordersTable.courier,
      status: ordersTable.status,
      deliveryCharge: ordersTable.deliveryCharge,
      deliveryZone: ordersTable.deliveryZone,
    })
    .from(ordersTable);

  // Per-courier stats
  const courierMap: Record<string, { shipments: number; delivered: number; revenue: number }> = {};
  for (const o of allOrders) {
    if (!o.courier) continue;
    if (!courierMap[o.courier]) courierMap[o.courier] = { shipments: 0, delivered: 0, revenue: 0 };
    if (["Shipped", "Out for delivery", "Delivered", "Processing", "Packed"].includes(o.status ?? "")) {
      courierMap[o.courier].shipments++;
    }
    if (o.status === "Delivered") courierMap[o.courier].delivered++;
    courierMap[o.courier].revenue += o.deliveryCharge ?? 0;
  }

  // Zone breakdown
  const zoneMap: Record<string, number> = {};
  for (const o of allOrders) {
    if (!o.deliveryZone) continue;
    zoneMap[o.deliveryZone] = (zoneMap[o.deliveryZone] ?? 0) + 1;
  }
  const totalZone = Object.values(zoneMap).reduce((a, b) => a + b, 0) || 1;
  const zones = Object.entries(zoneMap).map(([zone, count]) => ({
    zone,
    count,
    pct: Math.round((count / totalZone) * 100),
  }));

  // Overall KPIs
  const delivered = allOrders.filter((o) => o.status === "Delivered").length;
  const shipped = allOrders.filter((o) =>
    ["Shipped", "Out for delivery", "Delivered"].includes(o.status ?? "")
  ).length;
  const onTimePct = shipped > 0 ? Math.round((delivered / shipped) * 100) : 0;

  return c.json({
    couriers: courierMap,
    zones,
    onTimePct,
    totalShipments: shipped,
  });
});

export default app;
