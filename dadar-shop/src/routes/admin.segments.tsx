import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layers, Users } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/segments")({ component: SegmentsPage });

function SegmentsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("customers").then(d => { if (Array.isArray(d)) setCustomers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const segments = [
    { label: "New Customers", desc: "0-1 orders", count: customers.filter(c => (c.orders ?? 0) <= 1).length, color: "bg-blue-100 text-blue-800" },
    { label: "Returning", desc: "2-5 orders", count: customers.filter(c => (c.orders ?? 0) >= 2 && (c.orders ?? 0) <= 5).length, color: "bg-emerald-100 text-emerald-800" },
    { label: "Loyal", desc: "6-15 orders", count: customers.filter(c => (c.orders ?? 0) >= 6 && (c.orders ?? 0) <= 15).length, color: "bg-violet-100 text-violet-800" },
    { label: "VIP", desc: "16+ orders", count: customers.filter(c => (c.orders ?? 0) > 15).length, color: "bg-amber-100 text-amber-800" },
    { label: "Silver Tier", desc: "Silver members", count: customers.filter(c => c.tier === "Silver").length, color: "bg-slate-100 text-slate-700" },
    { label: "Gold Tier", desc: "Gold members", count: customers.filter(c => c.tier === "Gold").length, color: "bg-amber-100 text-amber-800" },
    { label: "Platinum Tier", desc: "Platinum members", count: customers.filter(c => c.tier === "Platinum").length, color: "bg-violet-100 text-violet-800" },
    { label: "High Spenders", desc: "Spend > ৳10,000", count: customers.filter(c => (c.spend ?? 0) > 10000).length, color: "bg-rose-100 text-rose-800" },
  ];

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Layers className="size-7" /> Customer Segments</h1>
        <p className="text-muted-foreground mt-1 text-sm">Analyze customer groups based on purchase behavior and loyalty tiers.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Customers</div><div className="text-display mt-1 text-2xl font-semibold">{customers.length}</div></div>
        {segments.slice(0, 3).map(s => (
          <div key={s.label} className="surface-card rounded-3xl p-4">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{s.label}</div>
            <div className="text-display mt-1 text-2xl font-semibold">{loading ? "…" : s.count}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {segments.map(s => (
          <div key={s.label} className="surface-card rounded-3xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">{s.label}</div>
              <div className="text-muted-foreground text-xs">{s.desc}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums">{loading ? "…" : s.count}</div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", s.color)}>{customers.length ? ((s.count / customers.length) * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
