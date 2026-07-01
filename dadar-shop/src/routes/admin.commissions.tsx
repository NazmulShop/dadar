import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layers, Save } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/commissions")({ component: CommissionsPage });

function CommissionsPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    adminFetch("sellers")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setSellers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function saveCommission(id: string) {
    const val = parseFloat(edits[id] ?? "");
    if (isNaN(val) || val < 0 || val > 100) { toast.error("Enter 0-100"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/sellers/${id}/commission`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ commission: val }),
    });
    if (res.ok) { setSellers(s => s.map(x => x.id === id ? { ...x, commission: val } : x)); toast.success("Commission updated"); }
    else toast.error("Failed");
  }

  const avgCommission = sellers.length ? (sellers.reduce((s, x) => s + (x.commission ?? 0), 0) / sellers.length).toFixed(1) : "—";

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Layers className="size-7" /> Commission Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">Set per-seller commission rates.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Avg Commission</div><div className="text-display mt-1 text-2xl font-semibold text-primary">{avgCommission}%</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Active Sellers</div><div className="text-display mt-1 text-2xl font-semibold">{sellers.filter(s => s.status === "Active").length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Sellers</div><div className="text-display mt-1 text-2xl font-semibold">{sellers.length}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wide text-left">
              <tr><th className="py-2 pr-4">Seller</th><th className="pr-4">Status</th><th className="pr-4">Current Rate</th><th className="pr-4">Set New Rate</th><th></th></tr>
            </thead>
            <tbody>
              {sellers.map(s => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2 pr-4 font-medium">{s.shop}</td>
                  <td className="pr-4 text-muted-foreground text-xs">{s.status}</td>
                  <td className="pr-4 font-semibold">{s.commission ?? 12}%</td>
                  <td className="pr-4"><Input className="h-8 w-20" type="number" placeholder={String(s.commission ?? 12)} value={edits[s.id] ?? ""} onChange={e => setEdits(x => ({ ...x, [s.id]: e.target.value }))} /></td>
                  <td><Button size="sm" variant="outline" onClick={() => saveCommission(s.id)}><Save className="size-3.5" /></Button></td>
                </tr>
              ))}
              {sellers.length === 0 && <tr><td colSpan={5} className="text-muted-foreground text-center py-8">No sellers yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
