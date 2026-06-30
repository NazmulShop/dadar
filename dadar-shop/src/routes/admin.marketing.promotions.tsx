import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Plus, Trash2, Tag } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/marketing/promotions")({ component: PromotionsPage });

function PromotionsPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", discount: "", type: "percent", minOrder: "", expiresAt: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    adminFetch<any[]>("promotions")
      .then(d => { setPromos(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function add() {
    if (!form.title || !form.discount) { toast.error("Title and discount required"); return; }
    setAdding(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ title: form.title, discount: parseFloat(form.discount), type: form.type, minOrder: parseFloat(form.minOrder) || 0, expiresAt: form.expiresAt || null }),
      });
      const d = await res.json();
      if (res.ok) { setPromos(prev => [...prev, d]); setForm({ title: "", discount: "", type: "percent", minOrder: "", expiresAt: "" }); toast.success("Promotion added"); }
      else toast.error(d.error ?? "Failed");
    } catch { toast.error("Failed"); }
    setAdding(false);
  }

  async function del(id: string) {
    if (!confirm("Delete promotion?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/promotions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setPromos(prev => prev.filter(p => p.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Megaphone className="size-7 text-violet-600" /> Promotions</h1>
        <p className="text-muted-foreground mt-1 text-sm">Create discount promotions and special offers.</p>
      </header>
      <div className="surface-card rounded-3xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3">Add Promotion</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><Label className="text-xs mb-1 block">Title</Label><Input placeholder="Summer Sale" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">Discount</Label><Input type="number" placeholder="10" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} /></div>
          <div>
            <Label className="text-xs mb-1 block">Type</Label>
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="percent">Percent (%)</option>
              <option value="flat">Flat (৳)</option>
            </select>
          </div>
          <div><Label className="text-xs mb-1 block">Min Order (৳)</Label><Input type="number" placeholder="Optional" value={form.minOrder} onChange={e => setForm(p => ({ ...p, minOrder: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">Expires At</Label><Input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} /></div>
        </div>
        <Button onClick={add} disabled={adding} variant="brand" size="sm" className="mt-3"><Plus className="size-4 mr-1" />Add Promotion</Button>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          promos.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No promotions yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted">
                  <tr>{["Title", "Discount", "Min Order", "Expires", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {promos.map(p => (
                    <tr key={p.id} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-3 font-medium">{p.title}</td>
                      <td className="px-4 py-3"><span className="bg-violet-100 text-violet-800 rounded-full px-2 py-0.5 text-[11px] font-semibold">{p.discount}{p.type === "percent" ? "%" : "৳"} off</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{p.minOrder ? formatBDT(p.minOrder) : "None"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "No expiry"}</td>
                      <td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => del(p.id)} className="text-rose-600"><Trash2 className="size-3" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </AdminLayout>
  );
}
