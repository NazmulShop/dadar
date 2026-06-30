import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Truck, Plus, Trash2, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping/charges")({ component: DeliveryChargesPage });

function DeliveryChargesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newZone, setNewZone] = useState({ name: "", charge: "", minOrder: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    adminFetch<any[]>("shipping-zones")
      .then(d => { setZones(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function add() {
    if (!newZone.name || !newZone.charge) { toast.error("Name and charge required"); return; }
    setAdding(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/shipping-zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name: newZone.name, charge: parseFloat(newZone.charge), minOrderForFree: parseFloat(newZone.minOrder) || null }),
      });
      const d = await res.json();
      if (res.ok) { setZones(prev => [...prev, d]); setNewZone({ name: "", charge: "", minOrder: "" }); toast.success("Zone added"); }
      else toast.error(d.error ?? "Failed");
    } catch { toast.error("Failed"); }
    setAdding(false);
  }

  async function del(id: string) {
    if (!confirm("Delete zone?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/shipping-zones/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setZones(prev => prev.filter(z => z.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Truck className="size-7" /> Delivery Charges</h1>
        <p className="text-muted-foreground mt-1 text-sm">Set shipping charges per delivery zone.</p>
      </header>
      <div className="surface-card rounded-3xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3">Add Delivery Zone</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label className="text-xs mb-1 block">Zone Name</Label><Input placeholder="e.g. Dhaka City" value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">Charge (৳)</Label><Input type="number" placeholder="60" value={newZone.charge} onChange={e => setNewZone(p => ({ ...p, charge: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">Free above (৳)</Label><Input type="number" placeholder="Optional" value={newZone.minOrder} onChange={e => setNewZone(p => ({ ...p, minOrder: e.target.value }))} /></div>
        </div>
        <Button onClick={add} disabled={adding} variant="brand" size="sm" className="mt-3"><Plus className="size-4 mr-1" />Add Zone</Button>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          zones.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No zones yet.</div> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted">
                <tr>{["Zone", "Charge", "Free Shipping Above", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {zones.map(z => (
                  <tr key={z.id} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3 font-medium">{z.name}</td>
                    <td className="px-4 py-3 font-semibold">{formatBDT(z.charge ?? 0)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{z.minOrderForFree ? formatBDT(z.minOrderForFree) : "Never"}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => del(z.id)} className="text-rose-600"><Trash2 className="size-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </AdminLayout>
  );
}
