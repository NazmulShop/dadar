import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatBDT } from "@/data/account";

export const Route = createFileRoute("/admin/sales-analytics")({ component: SalesAnalyticsPage });

function SalesAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("analytics").then(d => { if (d && !d.error) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const months = data?.months ?? [];
  const rev = data?.revenueSeries ?? [];
  const ord = data?.ordersSeries ?? [];
  const max = Math.max(...rev, 1);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><TrendingUp className="size-7 text-emerald-600" /> Sales Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Detailed sales trends, revenue breakdown and order volumes.</p>
      </header>

      {loading ? <p className="text-muted-foreground text-center py-12">Loading analytics…</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-4 mb-4">
            <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Revenue (6m)</div><div className="text-display mt-1 text-2xl font-semibold text-primary">{formatBDT(data?.totalRevenue ?? 0)}</div></div>
            <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Best Month</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{formatBDT(data?.bestMonth ?? 0)}</div></div>
            <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Avg / Month</div><div className="text-display mt-1 text-2xl font-semibold">{formatBDT(data?.avgMonthly ?? 0)}</div></div>
            <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Orders</div><div className="text-display mt-1 text-2xl font-semibold">{ord.reduce((a: number, b: number) => a + b, 0)}</div></div>
          </div>

          <div className="surface-card rounded-3xl p-5 mb-4">
            <h3 className="font-semibold text-sm mb-4">Monthly Revenue (BDT)</h3>
            <div className="flex h-48 items-end gap-3">
              {rev.map((v: number, i: number) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="bg-primary w-full rounded-t-xl transition-all" style={{ height: `${(v / max) * 100}%` }} title={formatBDT(v)} />
                  <div className="text-muted-foreground text-[10px]">{months[i]}</div>
                  <div className="text-[10px] font-semibold tabular-nums">৳{(v / 1000).toFixed(0)}k</div>
                </div>
              ))}
              {rev.length === 0 && <div className="w-full text-muted-foreground text-sm text-center py-12">No revenue data yet.</div>}
            </div>
          </div>

          <div className="surface-card rounded-3xl p-5">
            <h3 className="font-semibold text-sm mb-4">Monthly Orders</h3>
            <div className="flex h-36 items-end gap-3">
              {ord.map((v: number, i: number) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="bg-emerald-500 w-full rounded-t-xl" style={{ height: `${(v / Math.max(...ord, 1)) * 100}%` }} />
                  <div className="text-muted-foreground text-[10px]">{months[i]}</div>
                  <div className="text-[10px] font-semibold">{v}</div>
                </div>
              ))}
              {ord.length === 0 && <div className="w-full text-muted-foreground text-sm text-center py-8">No order data yet.</div>}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
