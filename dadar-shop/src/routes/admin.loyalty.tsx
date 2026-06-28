import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star, Award } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/loyalty")({ component: LoyaltyPage });

function LoyaltyPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ pointsPerBDT: "1", redeemRate: "10", silverThreshold: "1000", goldThreshold: "5000", platinumThreshold: "15000" });

  useEffect(() => {
    adminFetch("customers")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setCustomers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalPoints = customers.reduce((s, c) => s + (c.points ?? 0), 0);
  const tiers = [
    { name: "Silver", count: customers.filter(c => c.tier === "Silver").length, color: "bg-slate-100 text-slate-700" },
    { name: "Gold", count: customers.filter(c => c.tier === "Gold").length, color: "bg-amber-100 text-amber-800" },
    { name: "Platinum", count: customers.filter(c => c.tier === "Platinum").length, color: "bg-violet-100 text-violet-800" },
  ];

  async function saveConfig() {
    const res = await fetch(`${API_ORIGIN}/api/admin/loyalty/config`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(config),
    });
    if (res.ok) toast.success("Loyalty config saved"); else toast.error("Failed");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Star className="size-7 text-amber-500" /> Loyalty Program</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure loyalty points and manage customer tiers.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Points Issued</div><div className="text-display mt-1 text-2xl font-semibold text-amber-600">{totalPoints.toLocaleString()}</div></div>
        {tiers.map(t => (
          <div key={t.name} className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">{t.name}</div><div className="text-display mt-1 text-2xl font-semibold">{loading ? "…" : t.count}</div></div>
        ))}
      </div>

      <div className="surface-card rounded-3xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-4">Program Configuration</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><Label>Points per ৳1 spent</Label><Input className="mt-1" type="number" value={config.pointsPerBDT} onChange={e => setConfig(c => ({ ...c, pointsPerBDT: e.target.value }))} /></div>
          <div><Label>Redeem rate (points per ৳1)</Label><Input className="mt-1" type="number" value={config.redeemRate} onChange={e => setConfig(c => ({ ...c, redeemRate: e.target.value }))} /></div>
          <div><Label>Silver threshold (points)</Label><Input className="mt-1" type="number" value={config.silverThreshold} onChange={e => setConfig(c => ({ ...c, silverThreshold: e.target.value }))} /></div>
          <div><Label>Gold threshold (points)</Label><Input className="mt-1" type="number" value={config.goldThreshold} onChange={e => setConfig(c => ({ ...c, goldThreshold: e.target.value }))} /></div>
          <div><Label>Platinum threshold (points)</Label><Input className="mt-1" type="number" value={config.platinumThreshold} onChange={e => setConfig(c => ({ ...c, platinumThreshold: e.target.value }))} /></div>
        </div>
        <Button variant="hero" size="sm" className="mt-4" onClick={saveConfig}>Save Config</Button>
      </div>

      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">Top Loyalty Members</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : (
          <table className="w-full text-sm text-left">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="py-2 pr-4">Customer</th><th className="pr-4">Tier</th><th className="pr-4">Points</th><th className="pr-4">Orders</th><th>Spend</th></tr>
            </thead>
            <tbody>
              {customers.sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 10).map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2 pr-4 font-medium">{c.name}</td>
                  <td className="pr-4"><Award className="size-3.5 inline mr-1 text-amber-500" />{c.tier}</td>
                  <td className="pr-4 font-semibold text-amber-600 tabular-nums">{(c.points ?? 0).toLocaleString()}</td>
                  <td className="pr-4">{c.orders}</td>
                  <td>{formatBDT(c.spend ?? 0)}</td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={5} className="text-muted-foreground text-center py-8">No customers yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
