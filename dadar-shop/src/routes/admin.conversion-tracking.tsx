import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MousePointerClick } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/conversion-tracking")({ component: ConversionTrackingPage });

function ConversionTrackingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch("dashboard"),
    ]).then(([dash]) => { if (dash && !dash.error) setData(dash); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const orders = data?.orders ?? [];
  const totalOrders = orders.length;
  const delivered = orders.filter((o: any) => o.status === "Delivered").length;
  const cancelled = orders.filter((o: any) => o.status === "Cancelled").length;
  const conversionRate = totalOrders > 0 ? ((delivered / totalOrders) * 100).toFixed(1) : "0.0";

  const FUNNEL = [
    { label: "Total Orders Placed", value: totalOrders, pct: 100 },
    { label: "Orders Processed", value: orders.filter((o: any) => o.status !== "Placed").length, pct: totalOrders ? (orders.filter((o: any) => o.status !== "Placed").length / totalOrders) * 100 : 0 },
    { label: "Shipped", value: orders.filter((o: any) => ["Shipped", "Out for delivery", "Delivered"].includes(o.status)).length, pct: totalOrders ? (orders.filter((o: any) => ["Shipped", "Out for delivery", "Delivered"].includes(o.status)).length / totalOrders) * 100 : 0 },
    { label: "Successfully Delivered", value: delivered, pct: totalOrders ? (delivered / totalOrders) * 100 : 0 },
  ];

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><MousePointerClick className="size-7 text-violet-600" /> Conversion Tracking</h1>
        <p className="text-muted-foreground mt-1 text-sm">Order funnel and delivery conversion rates.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Conversion Rate</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{conversionRate}%</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Orders</div><div className="text-display mt-1 text-2xl font-semibold">{totalOrders}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Delivered</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{delivered}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Cancelled</div><div className="text-display mt-1 text-2xl font-semibold text-rose-700">{cancelled}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-6">Order Conversion Funnel</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : (
          <div className="space-y-4">
            {FUNNEL.map((step, i) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{i + 1}</span>
                    <span className="font-medium">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{step.value}</span>
                    <span className="text-muted-foreground text-xs w-12 text-right">{step.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-3 bg-surface-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", i === 0 ? "bg-blue-500" : i === 1 ? "bg-violet-500" : i === 2 ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: `${step.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-xs mt-4">Full funnel (visits → cart → checkout) requires analytics provider integration.</p>
      </div>
    </AdminLayout>
  );
}
