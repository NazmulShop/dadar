import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/automation-rules")({ component: AutomationRulesPage });

const TRIGGERS = ["order_placed","order_delivered","order_cancelled","payment_failed","review_posted","customer_signup","cart_abandoned","low_stock"];
const ACTIONS = ["send_email","send_sms","send_push","add_loyalty_points","apply_coupon","notify_admin","update_customer_tier"];

function AutomationRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "order_placed", action: "send_email", delay: "0", active: true });

  useEffect(() => {
    adminFetch("automation-rules").then(d => { if (Array.isArray(d)) setRules(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.name) { toast.error("Name required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/automation-rules`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ ...form, delay: parseInt(form.delay) || 0 }),
    });
    if (res.ok) { const d = await res.json(); setRules(r => [d, ...r]); toast.success("Rule created"); setShowForm(false); }
    else toast.error("Failed");
  }

  async function toggle(id: string, active: boolean) {
    const res = await fetch(`${API_ORIGIN}/api/admin/automation-rules/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) { setRules(r => r.map(x => x.id === id ? { ...x, active: !active } : x)); }
  }

  async function remove(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/automation-rules/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setRules(r => r.filter(x => x.id !== id)); toast.success("Rule deleted"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Activity className="size-7 text-violet-600" /> Automation Rules</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create trigger-based automations for orders, customers and marketing.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> New Rule</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Rules</div><div className="text-display mt-1 text-2xl font-semibold">{rules.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Active</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{rules.filter(r => r.active).length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Paused</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{rules.filter(r => !r.active).length}</div></div>
      </div>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">New Automation Rule</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Rule Name</Label><Input className="mt-1" placeholder="Welcome email" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Delay (minutes)</Label><Input className="mt-1" type="number" placeholder="0" value={form.delay} onChange={e => setForm(f => ({ ...f, delay: e.target.value }))} /></div>
            <div><Label>Trigger</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}>
                {TRIGGERS.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div><Label>Action</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}>
                {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={create}>Create Rule</Button><Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : rules.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No automation rules yet.</p>
        ) : (
          <div className="space-y-3">
            {rules.map(r => (
              <div key={r.id} className={cn("border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3", !r.active && "opacity-60")}>
                <div>
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    When <span className="font-medium text-foreground">{(r.trigger ?? "").replace(/_/g, " ")}</span> → <span className="font-medium text-foreground">{(r.action ?? "").replace(/_/g, " ")}</span>
                    {r.delay > 0 && ` (after ${r.delay}m)`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(r.id, r.active)} className="text-muted-foreground hover:text-foreground">
                    {r.active ? <ToggleRight className="size-5 text-emerald-600" /> : <ToggleLeft className="size-5" />}
                  </button>
                  <button onClick={() => remove(r.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
