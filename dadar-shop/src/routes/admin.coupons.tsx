import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Ticket, Plus, Trash2, Copy } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { adminFetch, adminPost, adminDelete } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/coupons")({ component: CouponsPage });

interface Coupon {
  id: string; code: string; type: "percent" | "flat"; value: number;
  minOrder: number; maxUses: number; usedCount: number; active: boolean; expiresAt: string | null;
}

function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent", value: "", minOrder: "", maxUses: "100", expiresAt: "" });

  function load() {
    setLoading(true);
    adminFetch<Coupon[]>("coupons")
      .then(d => { if (Array.isArray(d)) setCoupons(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.code || !form.value) { toast.error("Code and value required"); return; }
    setSaving(true);
    try {
      const created = await adminPost<Coupon>("coupons", {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: parseFloat(form.value),
        minOrder: parseFloat(form.minOrder) || 0,
        maxUses: parseInt(form.maxUses) || 100,
        expiresAt: form.expiresAt || null,
      });
      setCoupons(c => [created, ...c]);
      toast.success("Coupon created!");
      setShowForm(false);
      setForm({ code: "", type: "percent", value: "", minOrder: "", maxUses: "100", expiresAt: "" });
    } catch (e: any) { toast.error(e.message || "Failed to create coupon"); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    try {
      await adminDelete(`coupons/${id}`);
      setCoupons(c => c.filter(x => x.id !== id));
      toast.success("Coupon deleted");
    } catch (e: any) { toast.error(e.message || "Delete failed"); }
  }

  const totalUsed = coupons.reduce((s, c) => s + (c.usedCount ?? 0), 0);
  const active = coupons.filter(c => c.active).length;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Ticket className="size-7" /> Coupons</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create and manage discount coupons for customers.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> New Coupon</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Coupons</div><div className="text-2xl font-semibold mt-1">{coupons.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Active</div><div className="text-2xl font-semibold text-emerald-700 mt-1">{active}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Uses</div><div className="text-2xl font-semibold mt-1">{totalUsed}</div></div>
      </div>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Create New Coupon</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label>Code</Label><Input className="mt-1" placeholder="SAVE20" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
            <div><Label>Type</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (৳)</option>
              </select>
            </div>
            <div><Label>Value</Label><Input className="mt-1" type="number" min="0" placeholder={form.type === "percent" ? "20" : "200"} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div><Label>Min Order (৳)</Label><Input className="mt-1" type="number" min="0" placeholder="500" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} /></div>
            <div><Label>Max Uses</Label><Input className="mt-1" type="number" min="1" placeholder="100" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} /></div>
            <div><Label>Expires At</Label><Input className="mt-1" type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="hero" size="sm" onClick={create} disabled={saving}>{saving ? "Creating…" : "Create Coupon"}</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading && <p className="text-muted-foreground text-sm text-center py-8">Loading coupons…</p>}
        {error && <p className="text-rose-600 text-sm text-center py-8">{error}</p>}
        {!loading && !error && coupons.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No coupons yet. Create your first coupon above.</p>}
        {!loading && !error && coupons.length > 0 && (
          <div className="space-y-3">
            {coupons.map(c => (
              <div key={c.id} className={cn("border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3", !c.active && "opacity-60")}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary text-sm">{c.code}</span>
                    <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }} className="text-muted-foreground hover:text-foreground transition"><Copy className="size-3.5" /></button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {c.type === "percent" ? `${c.value}% off` : formatBDT(c.value) + " off"}
                    {c.minOrder > 0 && ` · Min order ${formatBDT(c.minOrder)}`}
                    {c.expiresAt && ` · Expires ${new Date(c.expiresAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <div className="font-semibold tabular-nums">{c.usedCount} / {c.maxUses}</div>
                    <div className="text-muted-foreground">used</div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", c.active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>{c.active ? "Active" : "Inactive"}</span>
                  <button onClick={() => remove(c.id)} className="text-rose-500 hover:text-rose-700 transition"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
