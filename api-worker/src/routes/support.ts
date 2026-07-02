/**
 * Support — full port of `api-server/src/routes/support.ts` (~387 lines).
 *
 * Preserves every URL, HTTP method, request body shape, response shape,
 * and status code from the Express version. Guests are accepted on
 * everything except ticket reads, matching Express.
 *
 * Differences from Express, none of which change the wire contract:
 *   - The fake "agent joins after 8s" / "bot replies after 1.2s" timers
 *     are inlined (Workers can't keep promises alive past a response).
 *     The frontend already polls the chat session endpoint and never
 *     depends on the visible delay.
 */
import { Hono } from "hono";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Env, Variables } from "../env";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { getDb } from "../db";
import {
  supportTicketsTable,
  ticketMessagesTable,
  supportFaqTable,
  kbArticlesTable,
  supportCallbacksTable,
  contactSubmissionsTable,
  chatSessionsTable,
  chatMessagesTable,
} from "../db";
import { logger } from "../lib/logger";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
app.use("*", optionalAuth());

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

/* ─────────────── Seed FAQ + KB ─────────────── */

async function ensureSupportSeeded(env: Env): Promise<void> {
  const db = getDb(env);
  const existing = await db.select({ count: count() }).from(supportFaqTable);
  if ((existing[0]?.count ?? 0) > 0) return;

  const faqs = [
    { id: "faq-01", question: "How do I track my order?", answer: "Go to Account → Orders and click on your order. You'll see real-time courier tracking with status updates. You can also use the tracking number in the courier's own app.", category: "Delivery", sortOrder: 1 },
    { id: "faq-02", question: "What is your return policy?", answer: "We accept returns within 7 days of delivery for most items. Products must be unused, in original packaging with all tags intact. Electronics have a 3-day return window. Some categories (innerwear, perishables) are non-returnable.", category: "Returns", sortOrder: 2 },
    { id: "faq-03", question: "How long does delivery take?", answer: "Inside Dhaka: 1–2 business days. Outside Dhaka: 3–5 business days. Remote areas may take 5–7 days. Express delivery (Dhaka only) is available for select products.", category: "Delivery", sortOrder: 3 },
    { id: "faq-04", question: "Which payment methods are accepted?", answer: "We accept bKash, Nagad, Rocket, Visa/Mastercard, DBBL Nexus, and Cash on Delivery (COD). COD has a ৳5,000 order limit. Mobile banking is our most popular payment option.", category: "Payment", sortOrder: 4 },
    { id: "faq-05", question: "How do I cancel an order?", answer: "You can cancel an order before it's packed. Go to Account → Orders → your order and click Cancel. Once shipped, cancellations are no longer possible — you would need to initiate a return after delivery.", category: "Orders", sortOrder: 5 },
    { id: "faq-06", question: "When will I get my refund?", answer: "Refunds are processed within 3–5 business days after we receive and inspect the returned item. Mobile banking refunds (bKash, Nagad) are usually instant once approved. Card refunds take 5–7 business days.", category: "Returns", sortOrder: 6 },
    { id: "faq-07", question: "Can I change my delivery address?", answer: "You can change the delivery address before the order is shipped. Contact us immediately via Live Chat or call our hotline. Once the order is with the courier, address changes may incur extra charges.", category: "Delivery", sortOrder: 7 },
    { id: "faq-08", question: "Are products authentic/original?", answer: "Yes. We work directly with authorized distributors and brands. All electronics come with manufacturer warranty. We have a zero-tolerance policy on counterfeit goods — report any suspicious product to our team.", category: "Products", sortOrder: 8 },
    { id: "faq-09", question: "How do loyalty points work?", answer: "You earn 1 point per ৳10 spent. Points never expire and can be redeemed at ৳1 per point on future purchases. Silver members earn 1×, Gold 1.5×, Platinum 2× points. Bonus points are awarded on birthdays and special campaigns.", category: "Account", sortOrder: 9 },
    { id: "faq-10", question: "What should I do if I received a wrong item?", answer: "We apologise for the inconvenience. Please submit a support ticket with your order ID and photos of the received item within 48 hours of delivery. We will arrange a free return pickup and send the correct item immediately.", category: "Orders", sortOrder: 10 },
  ];

  const articles = [
    { id: "kb-01", title: "How to initiate a return or exchange", slug: "how-to-return", body: "# How to Initiate a Return or Exchange\n\n## Step 1: Check eligibility\nItems must be returned within 7 days of delivery. Products must be unused, in original packaging, with all tags and accessories.\n\n## Step 2: Go to Account → Orders\nFind the order containing the item you want to return. Click the order to open details.\n\n## Step 3: Select items\nClick 'Request Return' next to the item. Choose a reason from the dropdown: Defective, Wrong item, Not as described, Changed mind, or Other.\n\n## Step 4: Schedule pickup\nChoose a convenient pickup date and time slot. We offer free return pickup for defective or wrong items.\n\n## Step 5: Track your return\nYou'll receive a return tracking number via SMS and email. Once we receive and inspect the item, your refund will be processed within 3–5 days.", category: "Returns" },
    { id: "kb-02", title: "Understanding your order status", slug: "order-statuses", body: "# Understanding Your Order Status\n\n**Placed** — Your order has been received and payment confirmed.\n\n**Processing** — Our warehouse is picking and packing your items.\n\n**Packed** — Items are packed and ready for courier pickup.\n\n**Shipped** — The courier has your package. Tracking is now active.\n\n**Out for Delivery** — Your package is with the local delivery agent and will arrive today.\n\n**Delivered** — Successfully delivered. If you haven't received it, contact us immediately.\n\n**Cancelled** — The order was cancelled (by you or us). Refund initiated if payment was made.\n\n**Returned** — Return accepted. Refund in progress.", category: "Orders" },
    { id: "kb-03", title: "Payment methods & mobile banking guide", slug: "payment-methods", body: "# Payment Methods at Dadar Shop\n\n## bKash\nMost popular. Select bKash at checkout, enter your bKash number, and approve the payment request on your bKash app. Transaction limit: ৳25,000 per transaction.\n\n## Nagad\nSelect Nagad at checkout. Enter your Nagad number. Approve via Nagad app. Limit: ৳20,000.\n\n## Rocket (DBBL)\nDutch-Bangla Bank mobile banking. Works similarly to bKash. Limit: ৳10,000.\n\n## Credit/Debit Card\nVisa and Mastercard accepted. Your card details are never stored — processed securely via SSL.\n\n## Cash on Delivery (COD)\nPay in cash when your order arrives. Maximum order value: ৳5,000. Available in major cities only.", category: "Payment" },
    { id: "kb-04", title: "Warranty & after-sales service", slug: "warranty-guide", body: "# Warranty & After-Sales Service\n\n## Manufacturer Warranty\nAll electronics on Dadar Shop come with official manufacturer warranty. The warranty period is listed on the product page (typically 1 year for most electronics).\n\n## How to Claim Warranty\n1. Keep your Dadar Shop invoice (digital copy sent via email).\n2. Contact the manufacturer's authorized service centre.\n3. Present your invoice as proof of purchase.\n\n## Dadar Shop's Own Guarantee\nFor the first 3 days after delivery, if a product has a manufacturing defect, we will replace it for free with free pickup — no questions asked.\n\n## What's Not Covered\n- Physical damage from drops or water\n- Unauthorized modifications\n- Normal wear and tear", category: "Products" },
    { id: "kb-05", title: "Seller marketplace — buying safely", slug: "marketplace-guide", body: "# Buying from Third-Party Sellers\n\nDadar Shop hosts verified third-party sellers on our marketplace. Here's how to shop safely.\n\n## Seller Verification\nAll sellers go through identity verification (NID/Passport + Trade License). Sellers must maintain a minimum 4.0 rating.\n\n## What We Guarantee\nRegardless of seller, Dadar Shop guarantees:\n- Authentic products\n- On-time delivery or compensation\n- Return & refund protection\n- Dispute resolution\n\n## Spotting Trusted Sellers\nLook for the ✓ Verified Seller badge. Check seller rating and number of completed orders.\n\n## Dispute Process\nIf you have an issue with a marketplace seller, open a support ticket. We mediate all disputes and enforce seller penalties for violations.", category: "Sellers" },
    { id: "kb-06", title: "Loyalty rewards programme explained", slug: "loyalty-programme", body: "# Dadar Loyalty Rewards Programme\n\n## Earning Points\n- ৳10 spent = 1 point\n- Silver tier: 1× multiplier\n- Gold tier: 1.5× multiplier\n- Platinum tier: 2× multiplier\n\n## Tier Requirements\n- Silver: Default (all customers)\n- Gold: ৳30,000+ lifetime spend\n- Platinum: ৳1,00,000+ lifetime spend\n\n## Redeeming Points\n- Minimum redemption: 200 points (= ৳200 discount)\n- Redeemable at checkout on any order\n- Points cannot be combined with other coupon codes\n\n## Bonus Events\n- Birthday bonus: 200 points added on your birthday month\n- Flash campaigns: 5× points on select products\n- Referral bonus: 100 points when a friend places their first order", category: "Account" },
    { id: "kb-07", title: "Delivery zones & shipping rates", slug: "delivery-zones", body: "# Delivery Zones & Rates\n\n## Inside Dhaka\n- Standard: ৳60 (1–2 days)\n- Express: ৳120 (same day, order before 12pm)\n- Free shipping on orders above ৳1,500\n\n## Outside Dhaka (Major Cities)\nChittagong, Sylhet, Rajshahi, Khulna, Barisal: ৳100 (2–4 days)\n\n## Nationwide (All Districts)\n- Regular: ৳130 (4–7 days)\n- Sundarban Courier, SA Paribahan, Redex and other services available\n\n## Remote Areas\nSome chars, haors, hill tracts may have limited service. Call our hotline before ordering.\n\n## Courier Partners\nPathao, Paperfly, Sundarban Courier, SA Paribahan, Redex, Steadfast, eCourier and more.", category: "Delivery" },
    { id: "kb-08", title: "Account security & privacy", slug: "account-security", body: "# Account Security & Privacy\n\n## Secure Your Account\n- Use a strong, unique password (12+ characters)\n- Enable two-factor authentication (2FA) via SMS\n- Never share your OTP with anyone — Dadar support will never ask for your OTP\n\n## What We Store\nWe store your name, email, phone, addresses, and order history. Payment card details are never stored — processed via tokenized, PCI-DSS compliant gateways.\n\n## Your Data Rights\nYou can request a full export of your data or account deletion at any time by contacting support.\n\n## Suspicious Activity\nIf you notice orders you didn't place or profile changes you didn't make, change your password immediately and contact us via the support hotline.", category: "Account" },
  ];

  await db.insert(supportFaqTable).values(faqs).onConflictDoNothing();
  await db.insert(kbArticlesTable).values(articles).onConflictDoNothing();
}

/* ─────────────── Chatbot logic ─────────────── */

interface BotRule {
  patterns: RegExp[];
  response: string;
}

const BOT_RULES: BotRule[] = [
  {
    patterns: [/track|where.*order|package.*status|shipment/i],
    response: "📦 To track your order:\n1. Go to **Account → Orders**\n2. Click your order to see live courier tracking\n3. You'll see your current status and expected delivery date\n\nIf you have a specific order ID, share it with a support agent for instant help.",
  },
  {
    patterns: [/return|refund|exchange|wrong item|damaged/i],
    response: "🔄 **Return & Refund Policy:**\n• 7-day return window from delivery date\n• Items must be unused, in original packaging\n• Electronics: 3-day defective-only return\n\nTo start a return: Account → Orders → select order → \"Request Return\"\n\nRefunds process in 3–5 business days after item inspection.",
  },
  {
    patterns: [/deliver|shipping|how long|arrive|fast/i],
    response: "🚚 **Delivery Timeframes:**\n• Inside Dhaka: 1–2 business days\n• Outside Dhaka (major cities): 2–4 days\n• Nationwide: 4–7 days\n• Express Dhaka: same day (order before 12pm)\n\nFree shipping on orders above ৳1,500!",
  },
  {
    patterns: [/pay|bkash|nagad|rocket|card|cash|cod|payment method/i],
    response: "💳 **We accept:**\n• bKash (most popular)\n• Nagad\n• Rocket (DBBL)\n• Visa / Mastercard\n• Cash on Delivery (COD, max ৳5,000)\n\nMobile banking payments are confirmed instantly. Card refunds take 5–7 days.",
  },
  {
    patterns: [/cancel|cancel order/i],
    response: "❌ **Cancellation Policy:**\nYou can cancel before your order is packed.\n\nTo cancel: Account → Orders → select order → \"Cancel Order\"\n\nIf the order is already shipped, you'll need to request a return after delivery.",
  },
  {
    patterns: [/coupon|discount|promo|code|offer/i],
    response: "🎁 **Discounts & Coupons:**\n• Check the promotions banner on our homepage\n• Loyalty members get exclusive coupon codes via SMS/email\n• Flash deals run every Friday — follow us on Facebook for alerts\n\nCoupon codes are entered at checkout on the payment page.",
  },
  {
    patterns: [/point|reward|loyalt|tier|gold|platinum|silver/i],
    response: "⭐ **Loyalty Points:**\n• Earn 1 point per ৳10 spent\n• Gold (৳30k+ spend): 1.5× points\n• Platinum (৳1L+ spend): 2× points\n• Redeem at ৳1 per point\n• Birthday bonus: 200 free points!\n\nCheck your points balance in Account → Rewards.",
  },
  {
    patterns: [/account|login|password|forgot|sign in|register/i],
    response: "🔐 **Account Help:**\n• Forgot password? Click \"Forgot password\" on the login page\n• You'll receive an OTP via SMS/email to reset\n• For account lockout or security issues, contact a live agent\n\nNever share your OTP with anyone — not even our support staff.",
  },
  {
    patterns: [/warrant|guarantee|authentic|original|fake|genuine/i],
    response: "✅ **Authenticity Guarantee:**\nAll products on Dadar Shop are 100% authentic. We work directly with authorized distributors.\n\nElectronics include manufacturer warranty (details on product page). Report any suspected counterfeit product to us immediately for a full refund.",
  },
  {
    patterns: [/seller|vendor|shop on dadar|sell/i],
    response: "🏪 **Become a Seller:**\nInterested in selling on Dadar Shop? Apply via the Seller Portal.\n\n• Free to register\n• Commission starts at 8%\n• Same-day payment settlement available\n• Dedicated seller support team\n\nGo to dadar.shop/seller or contact our merchant team.",
  },
  {
    patterns: [/hello|hi |hey |salaam|salam|assalamu|good morning|good evening/i],
    response: "👋 Hello! Welcome to Dadar Shop Support. I'm your AI assistant — I can help with:\n\n• Order tracking & status\n• Returns & refunds\n• Payment issues\n• Delivery queries\n• Account & password\n• Product questions\n\nWhat can I help you with today?",
  },
  {
    patterns: [/thank|thanks|dhonyobad/i],
    response: "😊 You're welcome! Is there anything else I can help you with? If you need further assistance, I can connect you with a live agent.",
  },
];

function getBotResponse(message: string): string {
  for (const rule of BOT_RULES) {
    if (rule.patterns.some((p) => p.test(message))) return rule.response;
  }
  return "🤔 I'm not sure about that — let me connect you with a human agent who can help.\n\nYou can also:\n• Browse our **FAQ** for quick answers\n• Submit a **support ticket** for detailed help\n• Call our hotline: **16xxx** (9am–9pm, 7 days)\n\nWould you like me to create a ticket for this issue?";
}

const AI_SYSTEM_PROMPT = `You are Dadar AI, the friendly and knowledgeable personal AI assistant for Dadar Shop — a Bangladesh-based e-commerce platform.

Your role is to help customers with:
- Order tracking and status updates
- Return and refund policies (7-day return window, full refund on defective items)
- Payment methods (bKash, Nagad, Rocket, cards, cash on delivery)
- Delivery timelines (Dhaka: 1-2 days, outside Dhaka: 3-5 days)
- Product questions and recommendations
- Account management (profile, addresses, loyalty points)
- Cancellation requests (can cancel within 1 hour of placing order)
- Loyalty points (1 point per ৳10 spent, redeem at checkout)
- Promotions and discount codes

Key policies:
- Free delivery on orders over ৳999
- Cash on delivery available for all areas
- 7-day easy return policy
- 24/7 AI support, live agents available 8am-10pm

Always respond in the same language the user writes in (Bengali or English).
Be warm, concise, and helpful. If you cannot resolve an issue, suggest creating a support ticket or contacting a live agent.
Never make up order details — tell the user to check their orders page for specifics.`;

interface AnthropicMessage { role: "user" | "assistant"; content: string }

async function getAiResponse(env: Env, message: string, history: AnthropicMessage[]): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        system: AI_SYSTEM_PROMPT,
        messages: [...history, { role: "user", content: message }],
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "[chatbot] Anthropic API returned non-OK status");
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((b) => b.type === "text")?.text;
    return text ?? null;
  } catch (err) {
    logger.warn({ err: String(err) }, "[chatbot] Anthropic API call failed");
    return null;
  }
}

/* ─────────────── Seeder middleware (fire-and-forget) ─────────────── */
app.use("*", async (c, next) => {
  // Mirror Express `router.use(... ensureSupportSeeded().catch(() => {}))`.
  // Don't block the request; surface failures only to logs.
  c.executionCtx.waitUntil(
    ensureSupportSeeded(c.env).catch((err) =>
      logger.warn({ err: String(err) }, "support seed failed"),
    ),
  );
  await next();
});

/* ─────────────── FAQ ─────────────── */

app.get("/faq", async (c) => {
  const db = getDb(c.env);
  const faqs = await db
    .select()
    .from(supportFaqTable)
    .orderBy(supportFaqTable.sortOrder);
  return c.json(faqs);
});

app.post("/faq/:id/helpful", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db
    .update(supportFaqTable)
    .set({ helpfulCount: sql`${supportFaqTable.helpfulCount} + 1` })
    .where(eq(supportFaqTable.id, id));
  return c.json({ ok: true });
});

/* ─────────────── Knowledge Base ─────────────── */

app.get("/kb", async (c) => {
  const db = getDb(c.env);
  const articles = await db
    .select({
      id: kbArticlesTable.id,
      title: kbArticlesTable.title,
      slug: kbArticlesTable.slug,
      category: kbArticlesTable.category,
      views: kbArticlesTable.views,
      helpful: kbArticlesTable.helpful,
      createdAt: kbArticlesTable.createdAt,
    })
    .from(kbArticlesTable)
    .orderBy(desc(kbArticlesTable.views));
  return c.json(articles);
});

app.get("/kb/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = getDb(c.env);
  const articles = await db
    .select()
    .from(kbArticlesTable)
    .where(eq(kbArticlesTable.slug, slug))
    .limit(1);
  if (!articles[0]) return c.json({ error: "Not found" }, 404);
  await db
    .update(kbArticlesTable)
    .set({ views: sql`${kbArticlesTable.views} + 1` })
    .where(eq(kbArticlesTable.slug, slug));
  return c.json(articles[0]);
});

app.post("/kb/:id/feedback", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ helpful: z.boolean() }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const db = getDb(c.env);
  const art = await db
    .select()
    .from(kbArticlesTable)
    .where(eq(kbArticlesTable.id, id))
    .limit(1);
  if (!art[0]) return c.json({ error: "Not found" }, 404);
  if (parsed.data.helpful) {
    await db
      .update(kbArticlesTable)
      .set({ helpful: sql`${kbArticlesTable.helpful} + 1` })
      .where(eq(kbArticlesTable.id, id));
  } else {
    await db
      .update(kbArticlesTable)
      .set({ notHelpful: sql`${kbArticlesTable.notHelpful} + 1` })
      .where(eq(kbArticlesTable.id, id));
  }
  return c.json({ ok: true });
});

/* ─────────────── Contact form ─────────────── */

app.post("/contact", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      subject: z.string().min(1),
      body: z.string().min(10),
      department: z.string().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const user = c.get("user");
  const id = generateId("CON");
  const db = getDb(c.env);
  await db.insert(contactSubmissionsTable).values({
    id,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    subject: parsed.data.subject,
    body: parsed.data.body,
    department: parsed.data.department ?? "General",
    userId: user?.id ?? null,
  });
  return c.json({ ok: true, id });
});

/* ─────────────── Callback ─────────────── */

app.post("/callback", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      name: z.string().min(1),
      phone: z.string().min(6),
      timeSlot: z.string().min(1),
      reason: z.string().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const user = c.get("user");
  const id = generateId("CB");
  const db = getDb(c.env);
  await db.insert(supportCallbacksTable).values({
    id,
    name: parsed.data.name,
    phone: parsed.data.phone,
    timeSlot: parsed.data.timeSlot,
    reason: parsed.data.reason ?? "",
    userId: user?.id ?? null,
  });
  return c.json({ ok: true, id });
});

/* ─────────────── Tickets ─────────────── */

app.get("/tickets", requireAuth(), async (c) => {
  const user = c.get("user")!;
  const db = getDb(c.env);
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, user.id))
    .orderBy(desc(supportTicketsTable.updatedAt));
  return c.json(tickets);
});

app.post("/tickets", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      subject: z.string().min(3),
      body: z.string().min(10),
      category: z.string().optional(),
      priority: z.string().optional(),
      orderId: z.string().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const user = c.get("user");
  const id = generateId("TKT");
  const db = getDb(c.env);
  await db.insert(supportTicketsTable).values({
    id,
    userId: user?.id ?? null,
    subject: parsed.data.subject,
    category: parsed.data.category ?? "Other",
    priority: parsed.data.priority ?? "Normal",
    status: "Open",
    orderId: parsed.data.orderId ?? null,
  });
  const msgId = generateId("MSG");
  await db.insert(ticketMessagesTable).values({
    id: msgId,
    ticketId: id,
    senderRole: "customer",
    senderName: user?.name ?? "Customer",
    body: parsed.data.body,
  });
  const agentMsgId = generateId("MSG");
  await db.insert(ticketMessagesTable).values({
    id: agentMsgId,
    ticketId: id,
    senderRole: "agent",
    senderName: "Dadar Support",
    body: `Thank you for contacting Dadar Shop support!\n\nWe've received your ticket (${id}) regarding: "${parsed.data.subject}". Our team will review it and respond within 2–4 business hours.\n\nYou'll be notified via SMS and email when we reply.`,
  });
  return c.json({ ok: true, id });
});

app.get("/tickets/:id", requireAuth(), async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const db = getDb(c.env);
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .where(
      and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)),
    )
    .limit(1);
  if (!tickets[0]) return c.json({ error: "Not found" }, 404);
  const messages = await db
    .select()
    .from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, id))
    .orderBy(ticketMessagesTable.createdAt);
  return c.json({ ...tickets[0], messages });
});

app.post("/tickets/:id/messages", requireAuth(), async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const db = getDb(c.env);
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .where(
      and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)),
    )
    .limit(1);
  if (!tickets[0]) return c.json({ error: "Not found" }, 404);

  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({ body: z.string().min(1) }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const msgId = generateId("MSG");
  await db.insert(ticketMessagesTable).values({
    id: msgId,
    ticketId: id,
    senderRole: "customer",
    senderName: user.name ?? "Customer",
    body: parsed.data.body,
  });
  await db
    .update(supportTicketsTable)
    .set({ status: "Awaiting reply", updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id));
  return c.json({ ok: true });
});

/* ─────────────── Chatbot ─────────────── */

app.post("/chatbot", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({
    message: z.string().min(1).max(4000),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(4000),
    })).max(20).optional(),
  }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const aiText = await getAiResponse(c.env, parsed.data.message, parsed.data.history ?? []);
  if (aiText) {
    return c.json({ response: aiText, source: "ai", at: new Date().toISOString() });
  }
  // No API key configured, or the Anthropic call failed — fall back to the
  // rule-based responder so the assistant still answers something useful.
  return c.json({
    response: getBotResponse(parsed.data.message),
    source: "rule-based",
    at: new Date().toISOString(),
  });
});

/* ─────────────── Live Chat ─────────────── */

app.post("/chat/start", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      topic: z.string().optional(),
      guestName: z.string().optional(),
      guestEmail: z.string().email().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const user = c.get("user");
  const id = generateId("CHAT");
  const db = getDb(c.env);
  await db.insert(chatSessionsTable).values({
    id,
    userId: user?.id ?? null,
    guestName: parsed.data.guestName ?? user?.name ?? "Guest",
    guestEmail: parsed.data.guestEmail ?? user?.email ?? null,
    customerName: parsed.data.guestName ?? user?.name ?? "Guest",
    customerEmail: parsed.data.guestEmail ?? user?.email ?? null,
    topic: parsed.data.topic ?? null,
    status: "Queued",
    agentName: null,
    lastMessage: "New chat session started",
    unread: 1,
  });
  const welcomeId = generateId("MSG");
  await db.insert(chatMessagesTable).values({
    id: welcomeId,
    sessionId: id,
    senderRole: "bot",
    senderName: "Dadar Bot",
    body: `👋 Hi${user?.name ? ` ${user.name}` : ""}! Welcome to Dadar Shop live support.\n\nYou're in the queue — an agent will join shortly. While you wait, I can help with common questions.\n\nWhat's your issue today?`,
  });
  return c.json({ sessionId: id });
});

app.get("/chat/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const db = getDb(c.env);
  const sessions = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, sessionId))
    .limit(1);
  if (!sessions[0]) return c.json({ error: "Not found" }, 404);
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(chatMessagesTable.createdAt);
  return c.json({ ...sessions[0], messages });
});

app.post("/chat/:sessionId/message", async (c) => {
  const sessionId = c.req.param("sessionId");
  const db = getDb(c.env);
  const sessions = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, sessionId))
    .limit(1);
  if (!sessions[0]) return c.json({ error: "Session not found" }, 404);

  const raw = await c.req.json().catch(() => null);
  const parsed = z.object({ body: z.string().min(1) }).safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);

  const msgId = generateId("MSG");
  await db.insert(chatMessagesTable).values({
    id: msgId,
    sessionId,
    senderRole: "customer",
    senderName: "You",
    body: parsed.data.body,
  });

  // Update session lastMessage and increment unread counter for admin
  await db.update(chatSessionsTable)
    .set({
      lastMessage: parsed.data.body.slice(0, 100),
      unread: sql`${chatSessionsTable.unread} + 1`,
    })
    .where(eq(chatSessionsTable.id, sessionId));

  // Express used a 1.2s setTimeout to insert the bot reply. Workers can't
  // keep a promise alive past the response — insert inline. The frontend
  // polls GET /chat/:sessionId and never relied on the visible delay.
  if (sessions[0].status === "Queued") {
    const botMsgId = generateId("MSG");
    await db.insert(chatMessagesTable).values({
      id: botMsgId,
      sessionId,
      senderRole: "bot",
      senderName: "Dadar Bot",
      body: getBotResponse(parsed.data.body),
    });
  }
  return c.json({ ok: true, id: msgId });
});

app.post("/chat/:sessionId/end", async (c) => {
  const sessionId = c.req.param("sessionId");
  const db = getDb(c.env);
  await db
    .update(chatSessionsTable)
    .set({ status: "Ended", endedAt: new Date() })
    .where(eq(chatSessionsTable.id, sessionId));
  const msgId = generateId("MSG");
  await db.insert(chatMessagesTable).values({
    id: msgId,
    sessionId,
    senderRole: "bot",
    senderName: "System",
    body: "Chat session ended. Thank you for contacting Dadar Shop support! If you need further help, start a new chat or submit a ticket.",
  });
  return c.json({ ok: true });
});

export default app;
