import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCcw, CheckCircle2 } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/data/account";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/payouts")({ component: PayoutsPage });

function PayoutsPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("sellers")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setSellers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function processPayout(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/sellers/${id}/payout`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ amount: sellers.find(s => s.id === id)?.pendingPayout ?? 0 }),
    });
    if (res.ok) {
      setSellers(s => s.map(x => x.id === id ? { ...x, pendingPayout: 0 } : x));
      toast.success("Payout processed");
    } else toast.error("Payout failed");
  }

  const totalPending = sellers.reduce((s, x) => s + (x.pendingPayout ?? 0), 0);
  const totalEarnings = sellers.reduce((s, x) => s + (x.earnings ?? 0), 0);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><RefreshCcw className="size-7" /> Payouts</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage seller payout requests and disbursements.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Pending</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{formatBDT(totalPending)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Disbursed</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{formatBDT(totalEarnings)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Active Sellers</div><div className="text-display mt-1 text-2xl font-semibold">{sellers.filter(s => s.status === "Active").length}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : sellers.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">No sellers yet.</p> : (
          <table className="w-full text-sm text-left">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="py-2 pr-4">Seller</th><th className="pr-4">Status</th><th className="pr-4">Earnings</th><th className="pr-4">Pending Payout</th><th></th></tr>
            </thead>
            <tbody>
              {sellers.map(s => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2 pr-4 font-medium">{s.shop}<div className="text-muted-foreground text-[10px]">{s.owner}</div></td>
                  <td className="pr-4"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", s.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{s.status}</span></td>
                  <td className="pr-4 tabular-nums">{formatBDT(s.earnings ?? 0)}</td>
                  <td className="pr-4 tabular-nums font-semibold text-amber-700">{formatBDT(s.pendingPayout ?? 0)}</td>
                  <td>{(s.pendingPayout ?? 0) > 0 && <Button size="sm" variant="outline" onClick={() => processPayout(s.id)}><CheckCircle2 className="size-3.5 mr-1" />Pay</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
