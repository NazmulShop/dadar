import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatBDT } from "@/data/account";

export const Route = createFileRoute("/admin/wishlist-analytics")({ component: WishlistAnalyticsPage });

function WishlistAnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("wishlist-analytics")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Heart className="size-7 text-rose-500" /> Wishlist Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Most wishlisted products and customer interest signals.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Wishlist Items</div><div className="text-display mt-1 text-2xl font-semibold">{data.reduce((s, d) => s + (d.count ?? 0), 0)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Top Wished Product</div><div className="text-display mt-1 text-lg font-semibold truncate">{data[0]?.productName ?? "—"}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Potential Revenue</div><div className="text-display mt-1 text-2xl font-semibold text-primary">{formatBDT(data.reduce((s, d) => s + (d.count ?? 0) * (d.price ?? 0), 0))}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">Most Wishlisted Products</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No wishlist data yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((d, i) => (
              <li key={d.productId ?? i} className="flex items-center gap-3 text-sm">
                <span className="size-6 rounded-full bg-surface-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 font-medium truncate">{d.productName}</span>
                <div className="w-32 bg-surface-muted h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(d.count / (data[0]?.count ?? 1)) * 100}%` }} />
                </div>
                <span className="font-semibold text-rose-600 tabular-nums w-10 text-right">{d.count}</span>
                <span className="text-muted-foreground tabular-nums">{formatBDT(d.price ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
