import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Store } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/lib/adminApi";
import { formatBDT } from "@/data/account";

export const Route = createFileRoute("/admin/vendors/performance")({ component: VendorPerformancePage });

function VendorPerformancePage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<any[]>("sellers")
      .then(d => { setSellers(Array.isArray(d) ? d.filter((s: any) => s.status === "Active") : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...sellers].sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0));

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><TrendingUp className="size-7 text-emerald-600" /> Vendor Performance</h1>
        <p className="text-muted-foreground mt-1 text-sm">Sales and earnings ranking for active vendors.</p>
      </header>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted">
                <tr>{["Rank", "Shop", "Owner", "Products", "Total Sales", "Earnings", "Pending Payout", "Commission"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((s, i) => (
                  <tr key={s.id} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3 font-bold text-muted-foreground">#{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{s.shop}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.owner}</td>
                    <td className="px-4 py-3">{s.products ?? 0}</td>
                    <td className="px-4 py-3 font-semibold">{formatBDT(s.sales ?? 0)}</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">{formatBDT(s.earnings ?? 0)}</td>
                    <td className="px-4 py-3 text-amber-700">{formatBDT(s.pendingPayout ?? 0)}</td>
                    <td className="px-4 py-3">{s.commission ?? 0}%</td>
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
