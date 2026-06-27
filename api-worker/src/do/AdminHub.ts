/**
 * AdminHub Durable Object — replaces the Express `adminClients` Set.
 *
 * Responsibilities:
 *   - Accept admin WebSocket connections (hibernatable API → free while idle).
 *   - Broadcast events to all live admin clients: order_update,
 *     review_pending, system_alert, system_ok, ping.
 *   - Run a 15-second health-check alarm (matches Express `startHealthMonitor(15000)`)
 *     which calls runHealthCheck() and emits system_alert / system_ok.
 *
 * Internal endpoints (called by the Worker via stub.fetch):
 *   GET  /internal/count                       → { count }
 *   POST /internal/broadcast   { event }       → { ok }
 *
 * Both internal endpoints require header `x-internal-secret` to match
 * env.INTERNAL_BROADCAST_SECRET when that secret is configured.
 */
import type { Env } from "../env";
import { runHealthCheck } from "../lib/health";

export type WSEvent =
  | { type: "order_update"; orderId: string; status: string; customerName: string; total: number; at: string }
  | { type: "review_pending"; reviewId: string; productName: string; authorName: string; rating: number; at: string }
  | { type: "system_alert"; severity: "warning" | "critical"; code: string; message: string; solution: string; at: string }
  | { type: "system_ok"; at: string }
  | { type: "ping"; at: string };

const HEALTH_INTERVAL_MS = 15_000;

export class AdminHub implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private wasAlertActive = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ── Internal: connection count ──
    if (url.pathname === "/internal/count") {
      if (!this.authorizeInternal(request)) return new Response("Forbidden", { status: 403 });
      const count = this.state.getWebSockets().length;
      return Response.json({ count });
    }

    // ── Internal: broadcast ──
    if (url.pathname === "/internal/broadcast" && request.method === "POST") {
      if (!this.authorizeInternal(request)) return new Response("Forbidden", { status: 403 });
      const body = (await request.json().catch(() => null)) as { event?: WSEvent } | null;
      if (!body?.event) return new Response("Bad request", { status: 400 });
      this.broadcast(body.event);
      return Response.json({ ok: true });
    }

    // ── WebSocket upgrade ──
    if (request.headers.get("upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Use hibernatable WebSockets — DO sleeps between messages, saving cost.
    this.state.acceptWebSocket(server);
    server.send(JSON.stringify({ type: "ping", at: new Date().toISOString() } satisfies WSEvent));

    // Ensure the health alarm is armed.
    const alarm = await this.state.storage.getAlarm();
    if (alarm === null) {
      await this.state.storage.setAlarm(Date.now() + HEALTH_INTERVAL_MS);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // Hibernatable message handler — no-op, but defined so the runtime keeps the WS attached.
  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {
    // Admin clients are read-only; we currently ignore inbound messages.
  }

  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  }

  webSocketError(ws: WebSocket, _err: unknown): void {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  }

  async alarm(): Promise<void> {
    try {
      const status = await runHealthCheck(this.env);
      const failed = status.checks.filter((x) => !x.ok);
      if (!status.ok && failed.length) {
        const worst = failed.find((c) => c.severity === "critical") ?? failed[0]!;
        const severity = failed.some((c) => c.severity === "critical") ? "critical" : "warning";
        this.broadcast({
          type: "system_alert",
          severity,
          code: worst.code,
          message: worst.message,
          solution: worst.solution,
          at: new Date().toISOString(),
        });
        this.wasAlertActive = true;
      } else if (this.wasAlertActive) {
        this.broadcast({ type: "system_ok", at: new Date().toISOString() });
        this.wasAlertActive = false;
      }
    } catch (err) {
      console.warn("[AdminHub] health alarm failed", err);
    } finally {
      // Re-arm only if any clients are still connected, otherwise let it stop.
      if (this.state.getWebSockets().length > 0) {
        await this.state.storage.setAlarm(Date.now() + HEALTH_INTERVAL_MS);
      }
    }
  }

  private broadcast(event: WSEvent): void {
    const data = JSON.stringify(event);
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    }
  }

  private authorizeInternal(request: Request): boolean {
    const secret = this.env.INTERNAL_BROADCAST_SECRET;
    // Fail closed: if the shared secret is not configured, refuse all
    // internal traffic. The DO is reachable from anywhere a Worker can
    // synthesize a fetch to it, so allowing unauthenticated calls would
    // expose admin broadcasts to anyone with the DO id.
    if (!secret || secret.length < 16) {
      console.error("[AdminHub] INTERNAL_BROADCAST_SECRET missing or too short — refusing internal call");
      return false;
    }
    const provided = request.headers.get("x-internal-secret");
    return typeof provided === "string" && provided === secret;
  }
}
