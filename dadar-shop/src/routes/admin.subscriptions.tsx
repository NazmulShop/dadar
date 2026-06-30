import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Repeat, CheckCircle2, XCircle } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatBDT } from "@/data/account";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subscriptions")({ component: SubscriptionsPage });

function SubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("subscriptions")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setSubs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function cancel(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/subscriptions/${id}/cancel`, {
      method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` }
    });
    if (res.ok) { setSubs(s => s.map(x => x.id === id ? { ...x, status: "cancelled" } : x)); toast.success("Subscription cancelled"); }
    else toast.error("Failed");
  }

  const active = subs.filter(s => s.status === "active").length;
  const mrr = subs.filter(s => s.status === "active").reduce((t, s) => t + (s.monthlyValue ?? 0), 0);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Repeat className="size-7" /> Subscriptions</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage recurring customer subscriptions and MRR.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Active Subscriptions</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{active}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">MRR</div><div className="text-display mt-1 text-2xl font-semibold text-primary">{formatBDT(mrr)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Subscriptions</div><div className="text-display mt-1 text-2xl font-semibold">{subs.length}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : subs.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No subscriptions yet.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="py-2 pr-4">Customer</th><th className="pr-4">Plan</th><th className="pr-4">Status</th><th className="pr-4">Next Billing</th><th className="pr-4">Value</th><th></th></tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2 pr-4 font-medium">{s.customerName}</td>
                  <td className="pr-4 text-muted-foreground">{s.plan ?? "Monthly"}</td>
                  <td className="pr-4">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      s.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                      {s.status}
                    </span>
                  </td>
                  <td className="pr-4 text-muted-foreground text-xs">{s.nextBilling ? new Date(s.nextBilling).toLocaleDateString() : "—"}</td>
                  <td className="pr-4 font-semibold tabular-nums">{formatBDT(s.monthlyValue ?? 0)}</td>
                  <td>{s.status === "active" && <button onClick={() => cancel(s.id)} className="text-rose-500 hover:text-rose-700"><XCircle className="size-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
