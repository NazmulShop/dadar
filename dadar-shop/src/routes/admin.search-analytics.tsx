import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/search-analytics")({ component: SearchAnalyticsPage });

function SearchAnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("search-analytics").then(d => { if (Array.isArray(d)) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const maxCount = data[0]?.count ?? 1;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Search className="size-7 text-blue-600" /> Search Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Top customer search queries and zero-result searches.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Searches</div><div className="text-display mt-1 text-2xl font-semibold">{data.reduce((s, d) => s + (d.count ?? 0), 0)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Unique Terms</div><div className="text-display mt-1 text-2xl font-semibold">{data.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Zero Results</div><div className="text-display mt-1 text-2xl font-semibold text-rose-600">{data.filter(d => d.results === 0).length}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">Top Search Terms</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No search data yet. Search tracking starts once customers use the search bar.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((d, i) => (
              <li key={d.query ?? i} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-muted-foreground text-xs text-right">{i + 1}</span>
                <span className="flex-1 font-medium">{d.query}</span>
                <div className="w-40 bg-surface-muted h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-semibold tabular-nums">{d.count}</span>
                {d.results === 0 && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">0 results</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
