import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Plus, Trash2, Calendar } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/campaigns")({ component: CampaignsPage });

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "email", target: "all", startDate: "", endDate: "", subject: "", body: "" });

  useEffect(() => {
    adminFetch("campaigns")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setCampaigns(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function createCampaign() {
    if (!form.name) { toast.error("Name required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/campaigns`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const d = await res.json();
      setCampaigns(c => [d, ...c]);
      toast.success("Campaign created"); setShowForm(false);
    } else toast.error("Failed");
  }

  async function deleteCampaign(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/campaigns/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setCampaigns(c => c.filter(x => x.id !== id)); toast.success("Deleted"); }
  }

  const TYPES = ["email", "sms", "push", "banner"];
  const STATUS_COLOR: Record<string, string> = { draft: "bg-surface-muted text-foreground", active: "bg-emerald-100 text-emerald-800", completed: "bg-blue-100 text-blue-800", paused: "bg-amber-100 text-amber-800" };

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Megaphone className="size-7" /> Campaigns</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create and manage marketing campaigns.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> New Campaign</Button>
        </div>
      </header>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">New Campaign</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Campaign Name</Label><Input className="mt-1" placeholder="Eid Sale 2025" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Type</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm capitalize" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div><Label>Target Audience</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                <option value="all">All Customers</option>
                <option value="new">New Customers</option>
                <option value="returning">Returning Customers</option>
                <option value="vip">VIP / Gold+</option>
              </select>
            </div>
            <div><Label>Subject</Label><Input className="mt-1" placeholder="Email subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div><Label>Start Date</Label><Input className="mt-1" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div><Label>End Date</Label><Input className="mt-1" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label>Message Body</Label>
              <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-24 resize-none" placeholder="Campaign message…" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="hero" size="sm" onClick={createCampaign}>Create Campaign</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : campaigns.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No campaigns yet.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <div key={c.id} className="border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-muted-foreground text-xs mt-0.5 flex items-center gap-2">
                    <span className="uppercase font-medium">{c.type}</span>
                    {c.startDate && <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(c.startDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLOR[c.status] ?? "bg-surface-muted text-foreground")}>
                    {c.status ?? "draft"}
                  </span>
                  <button onClick={() => deleteCampaign(c.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
