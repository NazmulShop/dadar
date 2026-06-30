import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Search } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/adminApi";
import { formatBDT, formatDay } from "@/data/account";

export const Route = createFileRoute("/admin/orders/pending")({ component: PendingOrdersPage });

function PendingOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminFetch<any[]>("orders")
      .then(d => { setOrders(Array.isArray(d) ? d.filter((o: any) => o.status === "Placed") : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    orders.filter(o => !q || o.id.toLowerCase().includes(q.toLowerCase()) || (o.customerName ?? "").toLowerCase().includes(q.toLowerCase())),
    [orders, q]);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Clock className="size-7 text-amber-600" /> Pending Orders</h1>
        <p className="text-muted-foreground mt-1 text-sm">{loading ? "Loading…" : `${filtered.length} orders awaiting action`}</p>
      </header>
      <div className="surface-card mb-4 rounded-3xl p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search orders…" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          filtered.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No pending orders.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted">
                  <tr>{["Order ID", "Customer", "Items", "Total", "Date"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(o => (
                    <tr key={o.id} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{o.id}</td>
                      <td className="px-4 py-3">{o.customerName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.items?.length ?? 0}</td>
                      <td className="px-4 py-3 font-semibold">{formatBDT(o.total ?? 0)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{o.createdAt ? formatDay(o.createdAt) : "—"}</td>
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
