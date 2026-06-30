import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Webhook, Plus, Trash2, RefreshCw } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/webhooks")({ component: WebhooksPage });

const EVENTS = ["order.placed","order.updated","order.delivered","order.cancelled","payment.completed","review.posted","product.updated","customer.created"];

function WebhooksPage() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: "", events: ["order.placed"], secret: "" });

  useEffect(() => {
    adminFetch("webhooks")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setHooks(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.url) { toast.error("URL required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/webhooks`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { const d = await res.json(); setHooks(h => [d, ...h]); toast.success("Webhook registered"); setShowForm(false); }
    else toast.error("Failed");
  }

  async function remove(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/webhooks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setHooks(h => h.filter(x => x.id !== id)); toast.success("Webhook removed"); }
  }

  async function testHook(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/webhooks/${id}/test`, { method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) toast.success("Test event sent!"); else toast.error("Test failed");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Webhook className="size-7 text-blue-600" /> Webhooks</h1>
            <p className="text-muted-foreground mt-1 text-sm">Register endpoints to receive real-time event notifications.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> Add Webhook</Button>
        </div>
      </header>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Register Webhook</h3>
          <div className="space-y-3">
            <div><Label>Endpoint URL</Label><Input className="mt-1" placeholder="https://yourapp.com/webhook" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
            <div><Label>Secret (for signature verification)</Label><Input className="mt-1" placeholder="whsec_…" value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} /></div>
            <div>
              <Label>Events to subscribe</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.events.includes(ev)}
                      onChange={e => setForm(f => ({ ...f, events: e.target.checked ? [...f.events, ev] : f.events.filter(x => x !== ev) }))}
                      className="rounded" />
                    <code className="text-xs">{ev}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={create}>Register</Button><Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : hooks.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No webhooks registered yet.</p>
        ) : (
          <div className="space-y-3">
            {hooks.map(h => (
              <div key={h.id} className="border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-primary truncate">{h.url}</div>
                    <div className="text-muted-foreground text-xs mt-1">{(h.events ?? []).join(" · ")}</div>
                    {h.lastTriggered && <div className="text-muted-foreground text-[10px] mt-0.5">Last triggered: {new Date(h.lastTriggered).toLocaleString()}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", (h.lastStatus ?? 200) < 300 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                      {h.lastStatus ?? "—"}
                    </span>
                    <button onClick={() => testHook(h.id)} className="p-1.5 rounded-xl hover:bg-surface-muted text-muted-foreground"><RefreshCw className="size-4" /></button>
                    <button onClick={() => remove(h.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
