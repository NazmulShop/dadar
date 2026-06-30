/**
 * D1 (SQLite) schema for Dadar Shop, originally ported from a Postgres
 * schema. Documenting the mapping rules here since they explain otherwise
 * non-obvious column type choices below.
 *
 * Mapping rules applied verbatim:
 *   - pgEnum(...)          → text({ enum: [...] }) + runtime validation in service layer
 *   - timestamp w/ defaultNow → integer({ mode: 'timestamp_ms' }) with default sql`(unixepoch() * 1000)`
 *                              (Drizzle returns/accepts Date — keeps `createdAt.getTime()` calls working)
 *   - jsonb                → text({ mode: 'json' })
 *   - numeric(3,2)         → real
 *   - boolean              → integer({ mode: 'boolean' })
 *   - references(onDelete) → SQLite FK (PRAGMA foreign_keys = ON is set on connect by D1)
 *
 * All column names, primary keys, uniqueness constraints, and defaults
 * are preserved 1:1 with the original schema.
 */
import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const now = sql`(unixepoch() * 1000)`;
const ts = (name: string, opts: { notNull?: boolean; default?: boolean } = {}) => {
  let c = integer(name, { mode: "timestamp_ms" });
  if (opts.notNull) c = c.notNull() as any;
  if (opts.default) c = c.default(now) as any;
  return c;
};

// ───── users ─────
export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user", "seller", "moderator"] }).notNull().default("user"),
  isSuperAdmin: integer("is_super_admin", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["active", "banned", "suspended"] }).notNull().default("active"),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  phoneVerified: integer("phone_verified", { mode: "boolean" }).notNull().default(false),
  avatarUrl: text("avatar_url"),
  failedLoginAttempts: text("failed_login_attempts").notNull().default("0"),
  lockedUntil: ts("locked_until"),
  superAdminCandidate: integer("super_admin_candidate", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at", { notNull: true, default: true }),
  updatedAt: ts("updated_at", { notNull: true, default: true }),
});
export type User = typeof usersTable.$inferSelect;

// ───── sessions (retained for cutover; KV is primary) ─────
export const sessionsTable = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  remember: integer("remember", { mode: "boolean" }).notNull().default(false),
  expiresAt: ts("expires_at", { notNull: true }),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── otp_codes ─────
export const otpCodesTable = sqliteTable("otp_codes", {
  id: text("id").primaryKey(),
  target: text("target").notNull(),
  code: text("code").notNull(),
  type: text("type", { enum: ["email_verify", "otp_login", "forgot_password", "admin_login"] }).notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  expiresAt: ts("expires_at", { notNull: true }),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── system_settings + admin_activity_logs ─────
export const systemSettingsTable = sqliteTable("system_settings", {
  id: text("id").primaryKey(),
  setupCompleted: integer("setup_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at", { notNull: true, default: true }),
  updatedAt: ts("updated_at", { notNull: true, default: true }),
});

export const adminActivityLogsTable = sqliteTable("admin_activity_logs", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  targetUserId: text("target_user_id"),
  action: text("action").notNull(),
  details: text("details", { mode: "json" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── commerce ─────
export const categoriesTable = sqliteTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  subcategories: text("subcategories", { mode: "json" }).$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

export const brandsTable = sqliteTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

export const productsTable = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  categorySlug: text("category_slug").notNull(),
  subcategory: text("subcategory"),
  brandName: text("brand_name").notNull(),
  sellerName: text("seller_name"),
  imageUrl: text("image_url"),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  badge: text("badge"),
  description: text("description"),
  status: text("status", { enum: ["active", "draft", "archived"] }).notNull().default("active"),
  createdAt: ts("created_at", { notNull: true, default: true }),
  updatedAt: ts("updated_at", { notNull: true, default: true }),
});

export const inventoryTable = sqliteTable("inventory", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }).unique(),
  onHand: integer("on_hand").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  reorderAt: integer("reorder_at").notNull().default(15),
  updatedAt: ts("updated_at", { notNull: true, default: true }),
});

export const ordersTable = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").references(() => usersTable.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  shipToLine1: text("ship_to_line1"),
  shipToArea: text("ship_to_area"),
  shipToCity: text("ship_to_city"),
  shipToPhone: text("ship_to_phone"),
  status: text("status", {
    enum: ["Placed", "Processing", "Packed", "Shipped", "Out for delivery", "Delivered", "Cancelled", "Returned"],
  }).notNull().default("Placed"),
  courier: text("courier").notNull().default("Pathao"),
  trackingNumber: text("tracking_number"),
  paymentMethod: text("payment_method", { enum: ["bKash", "Nagad", "Rocket", "Card", "COD"] }).notNull().default("bKash"),
  paymentStatus: text("payment_status", { enum: ["Pending", "Successful", "Failed"] }).notNull().default("Pending"),
  paymentReference: text("payment_reference"),
  paymentVerifiedAt: ts("payment_verified_at"),
  total: integer("total").notNull(),
  deliveryCharge: integer("delivery_charge").notNull().default(0),
  placedAt: ts("placed_at", { notNull: true, default: true }),
  updatedAt: ts("updated_at", { notNull: true, default: true }),
});

export const orderItemsTable = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: text("product_id"),
  productName: text("product_name").notNull(),
  qty: integer("qty").notNull().default(1),
  price: integer("price").notNull(),
});

export const refundsTable = sqliteTable("refunds", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id),
  productName: text("product_name").notNull(),
  reason: text("reason").notNull(),
  method: text("method").notNull(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["Pending", "Completed", "Rejected"] }).notNull().default("Pending"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

export const sellersTable = sqliteTable("sellers", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id),
  shop: text("shop").notNull(),
  owner: text("owner").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: text("status", { enum: ["Pending", "Active", "Suspended"] }).notNull().default("Pending"),
  products: integer("products").notNull().default(0),
  sales: integer("sales").notNull().default(0),
  earnings: integer("earnings").notNull().default(0),
  commission: integer("commission").notNull().default(12),
  pendingPayout: integer("pending_payout").notNull().default(0),
  createdAt: ts("created_at", { notNull: true, default: true }),
  updatedAt: ts("updated_at", { notNull: true, default: true }),
});

export const reviewsTable = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => productsTable.id),
  productName: text("product_name").notNull(),
  authorId: text("author_id").references(() => usersTable.id),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["Pending", "Published", "Rejected", "Reported"] }).notNull().default("Pending"),
  reports: integer("reports").notNull().default(0),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// Tags are intentionally freeform strings, not a normalized parent `tags`
// table with an id/name lookup. `tag` is just a plain text label attached to
// a product (e.g. "summer", "best-seller") — there is no separate tags
// table to join against, and no uniqueness constraint across products, so
// the same tag string can (and does) repeat freely across rows. If tag
// management (rename-everywhere, tag metadata, autocomplete from existing
// tags) is ever needed, that would require introducing a real `tags` table
// and turning this into a true many-to-many junction with a `tagId` FK.
export const tagProductsTable = sqliteTable("tag_products", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
});

// ───── support ─────
export const supportTicketsTable = sqliteTable("support_tickets", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  guestEmail: text("guest_email"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("Other"),
  priority: text("priority").notNull().default("Normal"),
  status: text("status").notNull().default("Open"),
  orderId: text("order_id"),
  message: text("message"),
  createdAt: ts("created_at", { notNull: true, default: true }),
  updatedAt: ts("updated_at", { notNull: true, default: true }),
});

export const ticketMessagesTable = sqliteTable("ticket_messages", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull(),
  senderRole: text("sender_role").notNull().default("customer"),
  senderName: text("sender_name").notNull().default("Customer"),
  body: text("body").notNull(),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

export const supportFaqTable = sqliteTable("support_faq", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("General"),
  helpfulCount: integer("helpful_count").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

export const kbArticlesTable = sqliteTable("kb_articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  body: text("body").notNull(),
  category: text("category").notNull().default("General"),
  views: integer("views").notNull().default(0),
  helpful: integer("helpful").notNull().default(0),
  notHelpful: integer("not_helpful").notNull().default(0),
  createdAt: ts("created_at", { notNull: true, default: true }),
  updatedAt: ts("updated_at", { notNull: true, default: true }),
});

export const supportCallbacksTable = sqliteTable("support_callbacks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  timeSlot: text("time_slot").notNull(),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("Pending"),
  note: text("note"),
  userId: text("user_id"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

export const contactSubmissionsTable = sqliteTable("contact_submissions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  department: text("department").notNull().default("General"),
  status: text("status").notNull().default("New"),
  userId: text("user_id"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

export const chatSessionsTable = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  status: text("status").notNull().default("Queued"),
  topic: text("topic"),
  agentName: text("agent_name"),
  lastMessage: text("last_message"),
  unread: integer("unread").notNull().default(0),
  startedAt: ts("started_at", { notNull: true, default: true }),
  endedAt: ts("ended_at"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

export const chatMessagesTable = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  senderRole: text("sender_role").notNull().default("customer"),
  senderName: text("sender_name").notNull().default("You"),
  sender: text("sender").default("customer"),
  body: text("body"),
  message: text("message"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── payout methods ─────
export const payoutMethodsTable = sqliteTable("payout_methods", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["wallet", "bank"] }).notNull(),
  wallet: text("wallet"),
  number: text("number"),
  bankName: text("bank_name"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  branch: text("branch"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── uploads (D1 fallback store) ─────
// Free-plan note: R2 is not available on the Cloudflare Workers free plan.
// When the `UPLOADS` (R2) binding is absent, images are stored directly in
// this D1 table instead, so image upload stays functional with zero extra
// paid resources. Capped (see lib/r2.ts) to stay well under D1's per-row
// size limits. Automatically superseded once R2 is bound on a paid plan.
export const uploadsTable = sqliteTable("uploads", {
  key: text("key").primaryKey(),
  contentType: text("content_type").notNull(),
  dataBase64: text("data_base64").notNull(),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── notifications (per-user, real-time replacing the old frontend
// mock NOTIFICATIONS array) ─────
export const notificationsTable = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  kind: text("kind", { enum: ["order", "promo", "system", "payment", "refund"] })
    .notNull()
    .default("system"),
  event: text("event"),
  link: text("link"),
  unread: integer("unread", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── saved addresses (per-user, replacing the old frontend mock
// ADDRESSES array) ─────
export const addressesTable = sqliteTable("addresses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  area: text("area").notNull(),
  city: text("city").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── reward ledger (per-user, event-sourced — the loyalty point
// balance is SUM(points) over a user's rows, not a stored counter, so it
// can never drift out of sync with the activity history shown in the UI).
// Replaces the old frontend mock REWARDS object. ─────
export const rewardLedgerTable = sqliteTable("reward_ledger", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  points: integer("points").notNull(), // positive = earned, negative = spent
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Coupons ─────
export const couponsTable = sqliteTable("coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("percent"),
  value: integer("value").notNull().default(0),
  minOrder: integer("min_order").notNull().default(0),
  maxUses: integer("max_uses").notNull().default(999),
  usedCount: integer("used_count").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  expiresAt: text("expires_at"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Campaigns ─────
export const campaignsTable = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("email"),
  target: text("target").notNull().default("all"),
  subject: text("subject"),
  body: text("body"),
  status: text("status").notNull().default("draft"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Banners ─────
export const bannersTable = sqliteTable("banners", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  position: text("position").notNull().default("hero"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Broadcast Notifications (admin-sent push/announcements) ─────
export const broadcastNotificationsTable = sqliteTable("broadcast_notifications", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("info"),
  target: text("target").notNull().default("all"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Flash Sales ─────
export const flashSalesTable = sqliteTable("flash_sales", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  productId: text("product_id"),
  discountPct: integer("discount_pct").notNull().default(0),
  maxQty: integer("max_qty").notNull().default(100),
  startAt: text("start_at"),
  endAt: text("end_at"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Abandoned Carts ─────
export const abandonedCartsTable = sqliteTable("abandoned_carts", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  itemCount: integer("item_count").notNull().default(0),
  total: integer("total").notNull().default(0),
  abandonedAt: ts("abandoned_at", { notNull: true, default: true }),
});

// ───── Wishlist Analytics ─────
export const wishlistAnalyticsTable = sqliteTable("wishlist_analytics", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  price: integer("price").notNull().default(0),
  count: integer("count").notNull().default(0),
});

// ───── Subscriptions ─────
export const subscriptionsTable = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  customerName: text("customer_name"),
  plan: text("plan").notNull().default("Monthly"),
  status: text("status").notNull().default("active"),
  monthlyValue: integer("monthly_value").notNull().default(0),
  nextBilling: text("next_billing"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Gift Cards ─────
export const giftCardsTable = sqliteTable("gift_cards", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  amount: integer("amount").notNull().default(0),
  usedAmount: integer("used_amount").notNull().default(0),
  recipientEmail: text("recipient_email"),
  message: text("message"),
  status: text("status").notNull().default("active"),
  expiresAt: text("expires_at"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Automation Rules ─────
export const automationRulesTable = sqliteTable("automation_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  action: text("action").notNull(),
  delay: integer("delay").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Push Notifications history ─────
export const pushNotificationsTable = sqliteTable("push_notifications", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  target: text("target").notNull().default("all"),
  url: text("url"),
  sentCount: integer("sent_count").notNull().default(0),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── API Keys ─────
export const apiKeysTable = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  permissions: text("permissions").notNull().default("read"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Webhooks ─────
export const webhooksTable = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  secret: text("secret"),
  events: text("events", { mode: "json" }).$type<string[]>(),
  lastStatus: integer("last_status"),
  lastTriggered: text("last_triggered"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Support Tickets ─────
// ───── Feedback ─────
export const feedbackTable = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  customerName: text("customer_name"),
  rating: integer("rating").notNull().default(5),
  comment: text("comment"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Disputes ─────
export const disputesTable = sqliteTable("disputes", {
  id: text("id").primaryKey(),
  orderId: text("order_id"),
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  productName: text("product_name"),
  reason: text("reason").notNull(),
  amount: integer("amount").notNull().default(0),
  status: text("status").notNull().default("pending"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── CMS Pages ─────
export const cmsPageTable = sqliteTable("cms_pages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Blog Posts ─────
export const blogPostsTable = sqliteTable("blog_posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content"),
  category: text("category").notNull().default("news"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Media ─────
export const mediaTable = sqliteTable("media", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  type: text("type"),
  size: integer("size").notNull().default(0),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Roles ─────
export const rolesTable = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  permissions: text("permissions", { mode: "json" }).$type<string[]>(),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Login Sessions ─────
export const loginSessionsTable = sqliteTable("login_sessions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  adminName: text("admin_name"),
  email: text("email"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  device: text("device"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Fraud Flags ─────
export const fraudFlagsTable = sqliteTable("fraud_flags", {
  id: text("id").primaryKey(),
  orderId: text("order_id"),
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  reason: text("reason").notNull(),
  details: text("details"),
  riskLevel: text("risk_level").notNull().default("medium"),
  amount: integer("amount").notNull().default(0),
  ipAddress: text("ip_address"),
  status: text("status").notNull().default("pending"),
  flaggedAt: ts("flagged_at", { notNull: true, default: true }),
});

// ───── Backups ─────
export const backupsTable = sqliteTable("backups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("completed"),
  size: integer("size").notNull().default(0),
  url: text("url"),
  createdAt: ts("created_at", { notNull: true, default: true }),
});

// ───── Search Analytics ─────
export const searchAnalyticsTable = sqliteTable("search_analytics", {
  id: text("id").primaryKey(),
  query: text("query").notNull().unique(),
  count: integer("count").notNull().default(1),
  results: integer("results").notNull().default(0),
});

// ───── rate_limit_counters (D1 fallback for the free-plan KV write cap) ─────
// Free-plan note: Workers KV is capped at 1,000 write operations per day,
// account-wide. The login/OTP flow used to write every rate-limit counter
// and Super Admin login ticket to KV (`RATE_KV`), so a handful of admin
// logins (each touching KV 3-4 times: issue ticket, OTP rate-limit, ticket
// advance, secret rate-limit) could exhaust the entire daily quota and
// start throwing "KV put() limit exceeded for the day" on every further
// login attempt, account-wide, until the next UTC midnight reset.
// D1's free-plan write allowance is far larger, so — same fallback pattern
// as `uploadsTable` above for R2 — rate-limit counters now live here
// instead of KV. Rows are short-lived (cleaned up opportunistically by
// `resetAt` on read) so this table never grows large.
export const rateLimitCountersTable = sqliteTable("rate_limit_counters", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  resetAt: ts("reset_at", { notNull: true }),
});

// ───── admin_login_tickets (D1 fallback for the free-plan KV write cap) ─────
// Same reasoning as `rateLimitCountersTable` above: the 3-step Super Admin
// login (password -> email OTP -> secret key) used to store its short-lived
// ticket in KV. Moved to D1 for the same free-plan write-quota reason.
export const adminLoginTicketsTable = sqliteTable("admin_login_tickets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  remember: integer("remember", { mode: "boolean" }).notNull().default(false),
  stage: text("stage", { enum: ["password_ok", "otp_ok"] }).notNull(),
  expiresAt: ts("expires_at", { notNull: true }),
  createdAt: ts("created_at", { notNull: true, default: true }),
});
