/**
 * /api/admin/ws — WebSocket upgrade handler.
 *
 * Auth (matches Express server):
 *   - Authorization: Bearer <jwt>   OR   ?token=<jwt>
 *   - Must resolve to a user with role in {admin, moderator}.
 *
 * On success the request is forwarded to the AdminHub Durable Object
 * which manages connection set, broadcasts, and the 15s health alarm.
 *
 * Free-plan note: Durable Objects are not available on the Cloudflare
 * Workers free plan. When ADMIN_HUB binding is absent the endpoint
 * returns 503 instead of crashing.
 */
import { eq } from "drizzle-orm";
import type { Env } from "../env";
import { getDb, usersTable } from "../db";
import { validateSession } from "../lib/session";

export async function handleWsUpgrade(req: Request, env: Env): Promise<Response> {
  // Durable Objects require the Workers Paid plan — not available on free tier.
  if (!env.ADMIN_HUB) {
    return new Response(
      JSON.stringify({
        error:
          "Admin WebSocket requires Durable Objects (Cloudflare Workers Paid plan). " +
          "Upgrade at dash.cloudflare.com to enable this feature.",
      }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }

  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  let token: string | null = null;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) token = auth.slice(7);
  if (!token) {
    try {
      token = new URL(req.url).searchParams.get("token");
    } catch {
      /* ignore */
    }
  }
  if (!token) return new Response("Unauthorized", { status: 401 });

  const session = await validateSession(env, token);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const db = getDb(env);
  const rows = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);
  const role = rows[0]?.role;
  if (role !== "admin" && role !== "moderator") {
    return new Response("Forbidden", { status: 403 });
  }

  const id = env.ADMIN_HUB.idFromName("global");
  const stub = env.ADMIN_HUB.get(id);
  return stub.fetch(req);
}
