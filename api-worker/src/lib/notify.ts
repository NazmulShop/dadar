/**
 * notify.ts — Fires the real Brevo emails for order & refund lifecycle
 * events (order placed, shipped, delivered, cancelled, refund approved/
 * rejected). Subject/body come from an admin override saved in
 * `message_templates` (edited via the admin "Email Templates" →
 * "Notification Copy" tab) and fall back to the shipped defaults below,
 * which mirror src/data/account.ts NOTIFICATION_TEMPLATES on the frontend.
 *
 * Callers should always wrap sendEventEmail in c.executionCtx.waitUntil —
 * a failed/slow email must never block or fail the order/refund request
 * itself. sendEventEmail already catches its own errors for the same reason.
 */
import type { Env } from "../env";
import { getDb, messageTemplatesTable } from "../db";
import { eq } from "drizzle-orm";
import { sendGenericEmail } from "./email";
import { logger } from "./logger";

export type NotifyEvent =
  | "new_order"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "refund_approved"
  | "refund_rejected"
  | "coupon_available";

const DEFAULTS: Record<NotifyEvent, { subject: string; email: string }> = {
  new_order: {
    subject: "Order {{orderId}} placed",
    email: "Hi {{name}}, thanks for shopping at Dadar Shop! Order {{orderId}} for ৳{{total}} has been received.",
  },
  order_shipped: {
    subject: "Order {{orderId}} shipped via {{courier}}",
    email: "Hi {{name}}, {{orderId}} has shipped with {{courier}} (tracking {{trackingNumber}}). ETA {{eta}}.",
  },
  order_delivered: {
    subject: "Order {{orderId}} delivered",
    email: "Hi {{name}}, {{orderId}} was delivered today. We'd love your review — earn 20 reward points.",
  },
  order_cancelled: {
    subject: "Order {{orderId}} cancelled",
    email: "Hi {{name}}, your order {{orderId}} has been cancelled. If you were charged, any refund due will be issued automatically.",
  },
  refund_approved: {
    subject: "Refund approved for {{refundId}}",
    email: "Hi {{name}}, refund {{refundId}} of ৳{{amount}} for order {{orderId}} has been approved via {{method}}.",
  },
  refund_rejected: {
    subject: "Update on your refund request {{refundId}}",
    email: "Hi {{name}}, after review we're unable to approve refund {{refundId}} for order {{orderId}}. Please contact support if you have questions.",
  },
  coupon_available: {
    subject: "New coupon for you: {{code}}",
    email: "Hi {{name}}, enjoy {{discount}} off with code {{code}}. Hurry, expires {{expiry}}.",
  },
};

function render(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * Sends the real transactional email for `event` to `to`, using an admin
 * override if one exists, otherwise the shipped default copy. Never throws —
 * failures are logged and swallowed so the calling order/refund flow is
 * unaffected.
 */
export async function sendEventEmail(
  env: Env,
  event: NotifyEvent,
  to: string | null | undefined,
  name: string,
  vars: Record<string, unknown> = {},
): Promise<void> {
  if (!to) return;
  try {
    let override: { subject: string | null; emailBody: string | null } | undefined;
    try {
      const db = getDb(env);
      const rows = await db.select().from(messageTemplatesTable).where(eq(messageTemplatesTable.event, event)).limit(1);
      override = rows[0];
    } catch {
      // message_templates may not exist on older DBs — fall back silently.
    }
    const def = DEFAULTS[event];
    const subject = render(override?.subject ?? def.subject, { name, ...vars });
    const bodyText = render(override?.emailBody ?? def.email, { name, ...vars });
    const result = await sendGenericEmail(env, { to, name, subject, bodyText });
    if (!result.success) {
      logger.warn({ event, to, error: result.error }, "[notify] event email failed to send");
    }
  } catch (err) {
    logger.warn({ event, to, err: String(err) }, "[notify] sendEventEmail threw");
  }
}
