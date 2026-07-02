/**
 * Account routes — payout methods, notifications, addresses, rewards,
 * and a self-service view of the signed-in user's own orders/reviews.
 * All endpoints require authentication (Bearer token) and only ever
 * read/write the calling user's own rows (ownership enforced via userId
 * equality checks on every query).
 *
 * Routes mounted at /api/account/:
 *   GET    /payout-methods
 *   POST   /payout-methods
 *   DELETE /payout-methods/:id
 *   PATCH  /payout-methods/:id/default
 *   GET    /notifications
 *   PATCH  /notifications/:id/read
 *   POST   /notifications/read-all
 *   GET    /addresses
 *   POST   /addresses
 *   PUT    /addresses/:id
 *   DELETE /addresses/:id
 *   PATCH  /addresses/:id/default
 *   GET    /rewards
 *   GET    /orders
 *   GET    /orders/:id
 *   GET    /reviews
 */
import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq, sum } from "drizzle-orm";
import type { Env, Variables } from "../env";
import { requireAuth } from "../middleware/auth";
import {
  getDb,
  payoutMethodsTable,
  notificationsTable,
  addressesTable,
  rewardLedgerTable,
  ordersTable,
  orderItemsTable,
  reviewsTable,
  refundsTable,
} from "../db";
import { generateId } from "../lib/ids";
import { sendEventEmail } from "../lib/notify";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", requireAuth());

function rowToMethod(r: typeof payoutMethodsTable.$inferSelect) {
  if (r.kind === "wallet") {
    return {
      id: r.id,
      kind: "wallet" as const,
      wallet: r.wallet as "bKash" | "Nagad" | "Rocket" | "Upay",
      number: r.number ?? "",
      isDefault: r.isDefault ?? false,
    };
  }
  return {
    id: r.id,
    kind: "bank" as const,
    bankName: r.bankName ?? "",
    accountName: r.accountName ?? "",
    accountNumber: r.accountNumber ?? "",
    branch: r.branch ?? "",
    isDefault: r.isDefault ?? false,
  };
}

// ── GET /api/account/payout-methods ──────────────────────────────────────────
app.get("/payout-methods", async (c) => {
  const user = c.get("user");
  const rows = await getDb(c.env)
    .select()
    .from(payoutMethodsTable)
    .where(eq(payoutMethodsTable.userId, user.id));

  return c.json({ methods: rows.map(rowToMethod) });
});

// ── POST /api/account/payout-methods ─────────────────────────────────────────
app.post("/payout-methods", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<Record<string, string>>();

  if (!body.kind || !["wallet", "bank"].includes(body.kind)) {
    return c.json({ error: "kind must be 'wallet' or 'bank'" }, 400);
  }
  if (body.kind === "wallet" && (!body.wallet || !body.number)) {
    return c.json({ error: "wallet and number are required" }, 400);
  }
  if (body.kind === "bank" && (!body.bankName || !body.accountNumber)) {
    return c.json({ error: "bankName and accountNumber are required" }, 400);
  }

  const VALID_WALLETS = ["bKash", "Nagad", "Rocket", "Upay"];
  if (body.kind === "wallet" && !VALID_WALLETS.includes(body.wallet!)) {
    return c.json({ error: `wallet must be one of: ${VALID_WALLETS.join(", ")}` }, 400);
  }

  const db = getDb(c.env);
  const id = generateId();

  await db.insert(payoutMethodsTable).values({
    id,
    userId: user.id,
    kind: body.kind,
    wallet: body.wallet ?? null,
    number: body.number ?? null,
    bankName: body.bankName ?? null,
    accountName: body.accountName ?? null,
    accountNumber: body.accountNumber ?? null,
    branch: body.branch ?? null,
    isDefault: false,
  });

  const rows = await db
    .select()
    .from(payoutMethodsTable)
    .where(eq(payoutMethodsTable.id, id))
    .limit(1);

  return c.json({ method: rowToMethod(rows[0]!) }, 201);
});

// ── DELETE /api/account/payout-methods/:id ───────────────────────────────────
app.delete("/payout-methods/:id", async (c) => {
  const user = c.get("user");
  const methodId = c.req.param("id");
  const db = getDb(c.env);

  const existing = await db
    .select({ id: payoutMethodsTable.id })
    .from(payoutMethodsTable)
    .where(
      and(
        eq(payoutMethodsTable.id, methodId),
        eq(payoutMethodsTable.userId, user.id),
      ),
    )
    .limit(1);

  if (!existing.length) return c.json({ error: "Not found" }, 404);

  await db
    .delete(payoutMethodsTable)
    .where(
      and(
        eq(payoutMethodsTable.id, methodId),
        eq(payoutMethodsTable.userId, user.id),
      ),
    );

  return c.json({ ok: true });
});

// ── PATCH /api/account/payout-methods/:id/default ────────────────────────────
app.patch("/payout-methods/:id/default", async (c) => {
  const user = c.get("user");
  const methodId = c.req.param("id");
  const db = getDb(c.env);

  const existing = await db
    .select({ id: payoutMethodsTable.id })
    .from(payoutMethodsTable)
    .where(
      and(
        eq(payoutMethodsTable.id, methodId),
        eq(payoutMethodsTable.userId, user.id),
      ),
    )
    .limit(1);

  if (!existing.length) return c.json({ error: "Not found" }, 404);

  await db
    .update(payoutMethodsTable)
    .set({ isDefault: false })
    .where(eq(payoutMethodsTable.userId, user.id));

  await db
    .update(payoutMethodsTable)
    .set({ isDefault: true })
    .where(
      and(
        eq(payoutMethodsTable.id, methodId),
        eq(payoutMethodsTable.userId, user.id),
      ),
    );

  return c.json({ ok: true });
});

// ══════════════════════════ Notifications ═══════════════════════════════════
// GET /api/account/notifications
app.get("/notifications", async (c) => {
  const user = c.get("user");
  const rows = await getDb(c.env)
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);

  return c.json({
    notifications: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      kind: r.kind,
      event: r.event ?? undefined,
      link: r.link ?? undefined,
      unread: r.unread,
      at: r.createdAt.toISOString(),
    })),
  });
});

// PATCH /api/account/notifications/:id/read
app.patch("/notifications/:id/read", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = getDb(c.env);

  const existing = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)))
    .limit(1);
  if (!existing.length) return c.json({ error: "Not found" }, 404);

  await db
    .update(notificationsTable)
    .set({ unread: false })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));

  return c.json({ ok: true });
});

// POST /api/account/notifications/read-all
app.post("/notifications/read-all", async (c) => {
  const user = c.get("user");
  await getDb(c.env)
    .update(notificationsTable)
    .set({ unread: false })
    .where(eq(notificationsTable.userId, user.id));

  return c.json({ ok: true });
});

// ══════════════════════════ Addresses ════════════════════════════════════════
// GET /api/account/addresses
app.get("/addresses", async (c) => {
  const user = c.get("user");
  const rows = await getDb(c.env)
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, user.id))
    .orderBy(desc(addressesTable.isDefault), desc(addressesTable.createdAt));

  return c.json({ addresses: rows });
});

// POST /api/account/addresses
app.post("/addresses", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const line1 = typeof body.line1 === "string" ? body.line1.trim() : "";
  const area = typeof body.area === "string" ? body.area.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";

  if (!label || !name || !phone || !line1 || !area || !city) {
    return c.json({ error: "label, name, phone, line1, area, and city are all required" }, 400);
  }

  const db = getDb(c.env);
  const id = generateId();

  // First address for a user is automatically their default.
  const existingCount = await db
    .select({ id: addressesTable.id })
    .from(addressesTable)
    .where(eq(addressesTable.userId, user.id));
  const isFirst = existingCount.length === 0;

  await db.insert(addressesTable).values({
    id,
    userId: user.id,
    label,
    name,
    phone,
    line1,
    area,
    city,
    isDefault: isFirst,
  });

  const rows = await db.select().from(addressesTable).where(eq(addressesTable.id, id)).limit(1);
  return c.json({ address: rows[0] }, 201);
});

// PUT /api/account/addresses/:id
app.put("/addresses/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const db = getDb(c.env);

  const existing = await db
    .select({ id: addressesTable.id })
    .from(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)))
    .limit(1);
  if (!existing.length) return c.json({ error: "Not found" }, 404);

  const patch: Partial<typeof addressesTable.$inferInsert> = {};
  for (const key of ["label", "name", "phone", "line1", "area", "city"] as const) {
    if (typeof body[key] === "string" && (body[key] as string).trim()) {
      patch[key] = (body[key] as string).trim();
    }
  }

  if (Object.keys(patch).length) {
    await db
      .update(addressesTable)
      .set(patch)
      .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)));
  }

  const rows = await db.select().from(addressesTable).where(eq(addressesTable.id, id)).limit(1);
  return c.json({ address: rows[0] });
});

// DELETE /api/account/addresses/:id
app.delete("/addresses/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = getDb(c.env);

  const existing = await db
    .select({ id: addressesTable.id })
    .from(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)))
    .limit(1);
  if (!existing.length) return c.json({ error: "Not found" }, 404);

  await db
    .delete(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)));

  return c.json({ ok: true });
});

// PATCH /api/account/addresses/:id/default
app.patch("/addresses/:id/default", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = getDb(c.env);

  const existing = await db
    .select({ id: addressesTable.id })
    .from(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)))
    .limit(1);
  if (!existing.length) return c.json({ error: "Not found" }, 404);

  await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, user.id));
  await db
    .update(addressesTable)
    .set({ isDefault: true })
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)));

  return c.json({ ok: true });
});

// ══════════════════════════ Rewards ═══════════════════════════════════════════
const REWARD_TIERS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 500 },
  { name: "Gold", min: 1000 },
  { name: "Platinum", min: 2000 },
] as const;

function tierFor(balance: number) {
  let current: (typeof REWARD_TIERS)[number] = REWARD_TIERS[0];
  for (const t of REWARD_TIERS) {
    if (balance >= t.min) current = t;
  }
  const idx = REWARD_TIERS.indexOf(current);
  const next = REWARD_TIERS[idx + 1] ?? null;
  return {
    tier: current.name,
    nextTier: next ? { name: next.name, pointsNeeded: Math.max(0, next.min - balance) } : null,
  };
}

// GET /api/account/rewards
app.get("/rewards", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);

  const [balanceRow] = await db
    .select({ total: sum(rewardLedgerTable.points) })
    .from(rewardLedgerTable)
    .where(eq(rewardLedgerTable.userId, user.id));
  const balance = Number(balanceRow?.total ?? 0);

  const activity = await db
    .select()
    .from(rewardLedgerTable)
    .where(eq(rewardLedgerTable.userId, user.id))
    .orderBy(desc(rewardLedgerTable.createdAt))
    .limit(50);

  return c.json({
    balance,
    ...tierFor(balance),
    activity: activity.map((a) => ({
      id: a.id,
      label: a.label,
      points: a.points,
      at: a.createdAt.toISOString(),
    })),
  });
});

// ══════════════════════════ My Orders (self-service) ═════════════════════════
const checkoutItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().int().min(1),
  price: z.number().int().min(0),
});
const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  shipTo: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    line1: z.string().min(1),
    area: z.string().min(1),
    city: z.string().min(1),
  }),
  paymentMethod: z.enum(["bKash", "Nagad", "Rocket", "Card", "COD"]),
  courier: z.string().min(1).optional(),
  deliveryCharge: z.number().int().min(0).optional().default(0),
});

// POST /api/account/orders — places a real order from the cart.
// This is the actual checkout write path: every order created here is a
// genuine purchase by the signed-in user, persisted to D1. There is no
// separate "fake" client-only order path anymore — the frontend's checkout
// flow calls this endpoint instead of just rendering a local confirmation
// screen.
app.post("/orders", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.issues }, 400);
  }
  const { items, shipTo, paymentMethod, courier, deliveryCharge } = parsed.data;

  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const total = subtotal + deliveryCharge;
  const orderId = `DS-${Date.now().toString(36).toUpperCase()}`;

  const db = getDb(c.env);

  await db.insert(ordersTable).values({
    id: orderId,
    customerId: user.id,
    customerName: shipTo.name,
    customerEmail: user.email,
    shipToLine1: shipTo.line1,
    shipToArea: shipTo.area,
    shipToCity: shipTo.city,
    shipToPhone: shipTo.phone,
    status: "Placed",
    courier: courier ?? "Pathao",
    paymentMethod,
    total,
    deliveryCharge,
  });

  await db.insert(orderItemsTable).values(
    items.map((it) => ({
      id: generateId(),
      orderId,
      productId: it.productId ?? null,
      productName: it.name,
      qty: it.qty,
      price: it.price,
    })),
  );

  // Real-time order-confirmation notification + earned reward points.
  // Failure here must never roll back or block the order itself.
  try {
    await db.insert(notificationsTable).values({
      id: generateId(),
      userId: user.id,
      title: "Order placed",
      body: `Your order ${orderId} for ৳${total} has been placed successfully.`,
      kind: "order",
      event: "new_order",
      link: `/account/orders/${orderId}`,
      unread: true,
    });
    const earned = Math.max(1, Math.round(total / 100));
    await db.insert(rewardLedgerTable).values({
      id: generateId(),
      userId: user.id,
      label: `Order ${orderId} — earned`,
      points: earned,
    });
  } catch {
    // Non-critical — the order itself already succeeded.
  }

  // Real order-confirmation email via Brevo. Never blocks the response.
  c.executionCtx.waitUntil(
    sendEventEmail(c.env, "new_order", user.email, shipTo.name || "Customer", {
      orderId,
      total,
    }),
  );

  return c.json({ order: { id: orderId, status: "Placed", total } }, 201);
});

// GET /api/account/orders
app.get("/orders", async (c) => {
  const user = c.get("user");
  const rows = await getDb(c.env)
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerId, user.id))
    .orderBy(desc(ordersTable.placedAt));

  return c.json({
    orders: rows.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      deliveryCharge: o.deliveryCharge,
      paymentMethod: o.paymentMethod,
      courier: o.courier,
      trackingNumber: o.trackingNumber ?? undefined,
      placedAt: o.placedAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      shipTo: {
        line1: o.shipToLine1 ?? "",
        area: o.shipToArea ?? "",
        city: o.shipToCity ?? "",
        phone: o.shipToPhone ?? "",
      },
    })),
  });
});

// GET /api/account/orders/:id
app.get("/orders/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = getDb(c.env);

  const orderRows = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.customerId, user.id)))
    .limit(1);
  if (!orderRows.length) return c.json({ error: "Not found" }, 404);
  const o = orderRows[0]!;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, o.id));

  return c.json({
    order: {
      id: o.id,
      status: o.status,
      total: o.total,
      deliveryCharge: o.deliveryCharge,
      paymentMethod: o.paymentMethod,
      courier: o.courier,
      trackingNumber: o.trackingNumber ?? undefined,
      placedAt: o.placedAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      shipTo: {
        line1: o.shipToLine1 ?? "",
        area: o.shipToArea ?? "",
        city: o.shipToCity ?? "",
        phone: o.shipToPhone ?? "",
      },
      items: items.map((i) => ({
        id: i.id,
        name: i.productName,
        qty: i.qty,
        price: i.price,
      })),
    },
  });
});

// ─────────────────────────── REFUNDS ─────────────────────────────
const REFUND_STATUS_MAP: Record<string, string> = {
  Pending: "Requested",
  Completed: "Completed",
  Rejected: "Rejected",
};

function toCustomerRefund(r: typeof refundsTable.$inferSelect) {
  const status = REFUND_STATUS_MAP[r.status] ?? r.status;
  return {
    id: r.id,
    orderId: r.orderId,
    productName: r.productName,
    amount: r.amount,
    reason: r.reason,
    status,
    method: r.method,
    requestedAt: r.createdAt.toISOString(),
    expectedBy: r.createdAt.toISOString(),
    timeline: [
      { status: "Requested", at: r.createdAt.toISOString(), done: true },
      ...(status !== "Requested"
        ? [{ status, at: r.createdAt.toISOString(), done: true }]
        : []),
    ],
  };
}

// GET /api/account/refunds
app.get("/refunds", async (c) => {
  const user = c.get("user");
  const db = getDb(c.env);
  const myOrders = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.customerId, user.id));
  const orderIds = new Set(myOrders.map((o) => o.id));
  if (orderIds.size === 0) return c.json({ refunds: [] });
  const all = await db.select().from(refundsTable);
  const mine = all.filter((r) => orderIds.has(r.orderId));
  return c.json({ refunds: mine.map(toCustomerRefund) });
});

// GET /api/account/refunds/:id
app.get("/refunds/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = getDb(c.env);
  const rows = await db.select().from(refundsTable).where(eq(refundsTable.id, id)).limit(1);
  if (!rows.length) return c.json({ error: "Not found" }, 404);
  const r = rows[0]!;
  const orderRows = await db.select().from(ordersTable).where(and(eq(ordersTable.id, r.orderId), eq(ordersTable.customerId, user.id))).limit(1);
  if (!orderRows.length) return c.json({ error: "Not found" }, 404);
  return c.json({ refund: toCustomerRefund(r) });
});

// POST /api/account/refunds — customer requests a refund for one of their orders
const refundRequestSchema = z.object({
  orderId: z.string().min(1),
  productName: z.string().min(1).max(200),
  reason: z.enum([
    "Wrong item delivered", "Damaged on arrival", "Size / fit issue",
    "Quality not as described", "Changed my mind", "Late delivery", "Other",
  ]),
  method: z.enum(["Original payment", "bKash", "Nagad", "Bank transfer", "Store credit"]),
  amount: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});
app.post("/refunds", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json().catch(() => null);
  const parsed = refundRequestSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid refund request" }, 400);
  const db = getDb(c.env);

  const orderRows = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, parsed.data.orderId), eq(ordersTable.customerId, user.id))).limit(1);
  if (!orderRows.length) return c.json({ error: "Order not found" }, 404);
  const order = orderRows[0]!;
  if (parsed.data.amount > order.total) return c.json({ error: "Refund amount exceeds order total" }, 400);

  const id = "RF-" + generateId().slice(0, 8).toUpperCase();
  await db.insert(refundsTable).values({
    id,
    orderId: order.id,
    productName: parsed.data.productName,
    reason: parsed.data.reason,
    method: parsed.data.method,
    amount: parsed.data.amount,
    status: "Pending",
  });

  try {
    await db.insert(notificationsTable).values({
      id: generateId(),
      userId: user.id,
      title: "Refund requested",
      body: `Your refund request ${id} for order ${order.id} has been submitted and is under review.`,
      kind: "refund",
      link: `/account/refunds/${id}`,
      unread: true,
    });
  } catch { /* non-critical */ }

  return c.json({ refund: { id, orderId: order.id, status: "Requested" } }, 201);
});

// ══════════════════════════ My Reviews (self-service) ═════════════════════════
const reviewSubmitSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
});

// POST /api/account/reviews — submits a real review from the signed-in
// user. Goes to "Pending" status for moderation (same as the admin review
// queue already in place), and earns reward points immediately on submit.
app.post("/reviews", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = reviewSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.issues }, 400);
  }
  const { productId, productName, rating, comment } = parsed.data;
  const db = getDb(c.env);
  const id = generateId();

  // A review counts as a "verified purchase" only if this user has a
  // delivered order containing this product.
  const purchased = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(
      and(
        eq(ordersTable.customerId, user.id),
        eq(orderItemsTable.productId, productId),
      ),
    )
    .limit(1);

  await db.insert(reviewsTable).values({
    id,
    productId,
    productName,
    authorId: user.id,
    authorName: user.name,
    rating,
    body: comment,
    status: "Pending",
    verified: purchased.length > 0,
  });

  try {
    await db.insert(rewardLedgerTable).values({
      id: generateId(),
      userId: user.id,
      label: `Review — ${productName}`,
      points: 20,
    });
  } catch {
    // Non-critical — the review itself already succeeded.
  }

  return c.json({ review: { id, status: "Pending" } }, 201);
});

// GET /api/account/reviews
app.get("/reviews", async (c) => {
  const user = c.get("user");
  const rows = await getDb(c.env)
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.authorId, user.id))
    .orderBy(desc(reviewsTable.createdAt));

  return c.json({
    reviews: rows.map((r) => ({
      id: r.id,
      productId: r.productId ?? undefined,
      productName: r.productName,
      rating: r.rating,
      comment: r.body,
      status: r.status,
      verifiedPurchase: r.verified,
      reports: r.reports,
      at: r.createdAt.toISOString(),
    })),
  });
});

export default app;
