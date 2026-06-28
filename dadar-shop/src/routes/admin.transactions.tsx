import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Search, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBDT, formatDay } from "@/data/account";
import { adminFetch } from "@/lib/adminApi";

export const Route = createFileRoute("/admin/transactions")({ component: TransactionsPage });

interface Order {
  id: string;
  customerName: string;
  paymentMethod: string;
  status: string;
  total: number;
  placedAt: string;
}

const PM_COLOR: Record<string, string> = {
  bKash: "bg-pink-100 text-pink-800",
  Nagad: "bg-orange-100 text-orange-800",
  Card: "bg-blue-100 text-blue-800",
  COD: "bg-teal-100 text-teal-800",
  Rocket: "bg-purple-100 text-purple-800",
};

const STATUS_COLOR: Record<string, string> = {
  Delivered: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-rose-100 text-rose-800",
  Shipped: "bg-blue-100 text-blue-800",
  Placed: "bg-amber-100 text-amber-800",
};

function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("All");

  useEffect(() => {
    adminFetch<Order[]>("orders")
      .then(d => { if (Array.isArray(d)) setOrders(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const methods = ["All", "bKash", "Nagad", "Card", "COD", "Rocket"];
  const filtered = orders.filter(o => {
    const mQ = !q || o.id.toLowerCase().includes(q.toLowerCase()) || (o.customerName ?? "").toLowerCase().includes(q.toLowerCase());
    const mM = method === "All" || o.paymentMethod === method;
    return mQ && mM;
  });

  const total = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const avg = orders.length ? Math.round(total / orders.length) : 0;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
          <CreditCard className="size-7" /> Transaction History
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Live payment transactions from all orders.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider mb-1"><DollarSign className="size-3" /> Total Volume</div>
          <div className="text-2xl font-semibold text-primary">{formatBDT(total)}</div>
        </div>
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider mb-1"><ShoppingBag className="size-3" /> Transactions</div>
          <div className="text-2xl font-semibold">{orders.length}</div>
        </div>
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider mb-1"><TrendingUp className="size-3" /> Avg Order Value</div>
          <div className="text-2xl font-semibold">{formatBDT(avg)}</div>
        </div>
      </div>

      <div className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by order ID or customer…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {methods.map(m => (
              <button key={m} onClick={() => setMethod(m)}
                className={cn("rounded-2xl px-3 py-1.5 text-xs font-medium transition", method === m ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground hover:bg-surface-muted/80")}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-muted-foreground text-sm text-center py-8">Loading transactions…</p>}
        {error && <p className="text-rose-600 text-sm text-center py-8">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground text-[11px] uppercase tracking-wide border-b border-border">
                <tr>
                  <th className="pb-2 pr-4">Order ID</th>
                  <th className="pr-4">Customer</th>
                  <th className="pr-4">Method</th>
                  <th className="pr-4">Status</th>
                  <th className="pr-4">Date</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-muted-foreground text-center py-8 text-sm">No transactions found.</td></tr>
                )}
                {filtered.map(o => (
                  <tr key={o.id} className="border-t border-border hover:bg-surface-muted/30 transition">
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{o.id.slice(0, 12)}…</td>
                    <td className="pr-4 font-medium">{o.customerName ?? "—"}</td>
                    <td className="pr-4">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", PM_COLOR[o.paymentMethod] ?? "bg-surface-muted text-foreground")}>{o.paymentMethod ?? "—"}</span>
                    </td>
                    <td className="pr-4">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLOR[o.status] ?? "bg-surface-muted text-foreground")}>{o.status}</span>
                    </td>
                    <td className="pr-4 text-muted-foreground text-xs">{o.placedAt ? formatDay(o.placedAt) : "—"}</td>
                    <td className="text-right font-semibold tabular-nums">{formatBDT(o.total ?? 0)}</td>
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
