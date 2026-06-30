import { Hono } from "hono";
import type { Env, Variables } from "../env";
import { runHealthCheck, getLastStatus } from "../lib/health";
import { connectedAdminCount } from "../lib/broadcast";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get("/healthz", (c) => c.json({ status: "ok" }));

app.get("/health/admin", async (c) => {
  try {
    const status = await runHealthCheck(c.env);
    const wsClients = await connectedAdminCount(c.env);
    return c.json({ ...status, wsClients });
  } catch (err) {
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

app.get("/health/admin/last", async (c) => {
  const last = await getLastStatus(c.env);
  const wsClients = await connectedAdminCount(c.env);
  return c.json({ ...last, wsClients });
});

export default app;
