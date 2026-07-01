/**
 * Broadcast helpers — POST WSEvent payloads into the AdminHub Durable Object
 * which fans them out to every connected admin client.
 *
 * Mirrors the Express helpers in `api-server/src/lib/websocket.ts`:
 *   broadcastOrderUpdate, broadcastReviewPending,
 *   broadcastSystemAlert, broadcastSystemOk.
 *
 * Free-plan note: Durable Objects are not available on the Cloudflare Workers
 * free plan. When ADMIN_HUB binding is absent, broadcasts are silently skipped —
 * the originating request still succeeds. No crash or error is thrown.
 */
import type { Env } from "../env";
import { logger } from "./logger";

export type WSEvent =
  | { type: "order_update"; orderId: string; status: string; customerName: string; total: number; at: string }
  | { type: "review_pending"; reviewId: string; productName: string; authorName: string; rating: number; at: string }
  | { type: "system_alert"; severity: "warning" | "critical"; code: string; message: string; solution: string; at: string }
  | { type: "system_ok"; at: string }
  | { type: "ping"; at: string };

function getStub(env: Env) {
  if (!env.ADMIN_HUB) return null;
  const id = env.ADMIN_HUB.idFromName("global");
  return env.ADMIN_HUB.get(id);
}

async function send(env: Env, event: WSEvent): Promise<void> {
  // Durable Objects not bound (e.g. free plan) — skip silently.
  if (!env.ADMIN_HUB) return;

  if (!env.INTERNAL_BROADCAST_SECRET || env.INTERNAL_BROADCAST_SECRET.length < 16) {
    logger.warn(
      { event: event.type },
      "INTERNAL_BROADCAST_SECRET not configured (>=16 chars) — admin broadcast skipped (fail-closed)",
    );
    return;
  }
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-internal-secret": env.INTERNAL_BROADCAST_SECRET,
    };
    const stub = getStub(env)!;
    await stub.fetch("https://admin-hub.internal/internal/broadcast", {
      method: "POST",
      headers,
      body: JSON.stringify({ event }),
    });
  } catch (err) {
    // Never let a broadcast failure break the originating request.
    logger.warn({ err: String(err), event: event.type }, "broadcast failed");
  }
}

export function broadcastOrderUpdate(
  env: Env,
  orderId: string,
  status: string,
  customerName: string,
  total: number,
): Promise<void> {
  return send(env, {
    type: "order_update",
    orderId,
    status,
    customerName,
    total,
    at: new Date().toISOString(),
  });
}

export function broadcastReviewPending(
  env: Env,
  reviewId: string,
  productName: string,
  authorName: string,
  rating: number,
): Promise<void> {
  return send(env, {
    type: "review_pending",
    reviewId,
    productName,
    authorName,
    rating,
    at: new Date().toISOString(),
  });
}

export function broadcastSystemAlert(
  env: Env,
  severity: "warning" | "critical",
  code: string,
  message: string,
  solution: string,
): Promise<void> {
  return send(env, {
    type: "system_alert",
    severity,
    code,
    message,
    solution,
    at: new Date().toISOString(),
  });
}

export function broadcastSystemOk(env: Env): Promise<void> {
  return send(env, { type: "system_ok", at: new Date().toISOString() });
}

export async function connectedAdminCount(env: Env): Promise<number> {
  try {
    if (!env.ADMIN_HUB) return 0;
    if (!env.INTERNAL_BROADCAST_SECRET || env.INTERNAL_BROADCAST_SECRET.length < 16) return 0;
    const headers: Record<string, string> = { "x-internal-secret": env.INTERNAL_BROADCAST_SECRET };
    const stub = getStub(env)!;
    const res = await stub.fetch("https://admin-hub.internal/internal/count", { headers });
    if (!res.ok) return 0;
    const data = (await res.json()) as { count?: number };
    return data.count ?? 0;
  } catch {
    return 0;
  }
}
