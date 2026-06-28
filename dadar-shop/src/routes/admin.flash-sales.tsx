import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Zap, Plus, Trash2 } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/flash-sales")({ component: FlashSalesPage });

function FlashSalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", productId: "", discountPct: "", startAt: "", endAt: "", maxQty: "" });

  useEffect(() => {
    const h = { Authorization: `Bearer ${getAdminToken()}` };
    Promise.all([
      fetch(`${API_ORIGIN}/api/admin/flash-sales`, { headers: h }).then(r => r.json()),
      fetch(`${API_ORIGIN}/api/admin/products`, { headers: h }).then(r => r.json()),
    ]).then(([s, p]) => {
      if (Array.isArray(s)) setSales(s);
      if (Array.isArray(p)) setProducts(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.name || !form.discountPct) { toast.error("Name and discount required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/flash-sales`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ ...form, discountPct: parseFloat(form.discountPct), maxQty: parseInt(form.maxQty) || 100 }),
    });
    if (res.ok) { const d = await res.json(); setSales(s => [d, ...s]); toast.success("Flash sale created!"); setShowForm(false); }
    else toast.error("Failed");
  }

  async function remove(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/flash-sales/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setSales(s => s.filter(x => x.id !== id)); toast.success("Deleted"); }
  }

  const now = Date.now();
  const active = sales.filter(s => new Date(s.startAt).getTime() <= now && new Date(s.endAt).getTime() >= now);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Zap className="size-7 text-amber-500" /> Flash Sales</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create time-limited flash sales with product-specific discounts.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> New Flash Sale</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Active Sales</div><div className="text-display mt-1 text-2xl font-semibold text-amber-600">{active.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Sales</div><div className="text-display mt-1 text-2xl font-semibold">{sales.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Products on Sale</div><div className="text-display mt-1 text-2xl font-semibold">{new Set(sales.map(s => s.productId).filter(Boolean)).size}</div></div>
      </div>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Create Flash Sale</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Sale Name</Label><Input className="mt-1" placeholder="Eid Mega Sale" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Discount %</Label><Input className="mt-1" type="number" placeholder="30" value={form.discountPct} onChange={e => setForm(f => ({ ...f, discountPct: e.target.value }))} /></div>
            <div><Label>Product (optional)</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
                <option value="">All products</option>
                {products.slice(0, 50).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><Label>Max Quantity</Label><Input className="mt-1" type="number" placeholder="100" value={form.maxQty} onChange={e => setForm(f => ({ ...f, maxQty: e.target.value }))} /></div>
            <div><Label>Start</Label><Input className="mt-1" type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} /></div>
            <div><Label>End</Label><Input className="mt-1" type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="hero" size="sm" onClick={create}>Create</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : sales.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No flash sales yet.</p>
        ) : (
          <div className="space-y-3">
            {sales.map(s => {
              const isActive = new Date(s.startAt).getTime() <= now && new Date(s.endAt).getTime() >= now;
              return (
                <div key={s.id} className="border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{s.name}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", isActive ? "bg-amber-100 text-amber-800" : "bg-surface-muted text-foreground")}>
                        {isActive ? "⚡ Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {s.discountPct}% off · {s.startAt ? new Date(s.startAt).toLocaleString() : ""} → {s.endAt ? new Date(s.endAt).toLocaleString() : ""}
                    </div>
                  </div>
                  <button onClick={() => remove(s.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="size-4" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
