import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Search, TrendingUp, ShoppingBag, DollarSign, CheckCircle2, Clock, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBDT, formatDay } from "@/data/account";
import { adminFetch, adminPut } from "@/lib/adminApi";

export const Route = createFileRoute("/admin/transactions")({ component: PaymentsPage });

type PaymentStatus = "Pending" | "Successful" | "Failed";

interface Payment {
  orderId: string;
  customerName: string;
  customerEmail: string | null;
  method: string;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  paymentVerifiedAt: string | null;
  orderStatus: string;
  placedAt: string;
}

interface PaymentsResponse {
  payments: Payment[];
  totals: { pending: number; successful: number; failed: number; successfulAmount: number };
}

const PM_COLOR: Record<string, string> = {
  bKash: "bg-pink-100 text-pink-800",
  Nagad: "bg-orange-100 text-orange-800",
  Card: "bg-blue-100 text-blue-800",
  COD: "bg-teal-100 text-teal-800",
  Rocket: "bg-purple-100 text-purple-800",
};

const PAY_STATUS_STYLE: Record<PaymentStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Successful: "bg-emerald-100 text-emerald-800",
  Failed: "bg-rose-100 text-rose-800",
};

const PAY_STATUS_ICON: Record<PaymentStatus, any> = {
  Pending: Clock,
  Successful: CheckCircle2,
  Failed: XCircle,
};

function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totals, setTotals] = useState<PaymentsResponse["totals"]>({ pending: 0, successful: 0, failed: 0, successfulAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | PaymentStatus>("All");
  const [updating, setUpdating] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminFetch<PaymentsResponse>("payments")
      .then((d) => {
        if (d?.payments) {
          setPayments(d.payments);
          setTotals(d.totals);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(orderId: string, paymentStatus: PaymentStatus) {
    setUpdating(orderId);
    const prev = payments;
    setPayments((list) => list.map((p) => (p.orderId === orderId ? { ...p, paymentStatus } : p)));
    try {
      await adminPut(`payments/${orderId}/status`, { paymentStatus });
      load();
    } catch (e) {
      setPayments(prev);
      setError(e instanceof Error ? e.message : "Failed to update payment status");
    } finally {
      setUpdating(null);
    }
  }

  const methods = ["All", "bKash", "Nagad", "Card", "COD", "Rocket"];
  const statuses: ("All" | PaymentStatus)[] = ["All", "Pending", "Successful", "Failed"];

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const mQ =
        !q ||
        p.orderId.toLowerCase().includes(q.toLowerCase()) ||
        (p.customerName ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (p.customerEmail ?? "").toLowerCase().includes(q.toLowerCase());
      const mM = method === "All" || p.method === method;
      const mS = statusFilter === "All" || p.paymentStatus === statusFilter;
      return mQ && mM && mS;
    });
  }, [payments, q, method, statusFilter]);

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const avg = payments.length ? Math.round(total / payments.length) : 0;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
          <CreditCard className="size-7" /> Payments History &amp; Requests
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Live payment transactions from all orders — verify pending payments as Successful or Failed.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-4">
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider mb-1"><DollarSign className="size-3" /> Total Volume</div>
          <div className="text-2xl font-semibold text-primary">{formatBDT(total)}</div>
        </div>
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider mb-1"><ShoppingBag className="size-3" /> Transactions</div>
          <div className="text-2xl font-semibold">{payments.length}</div>
        </div>
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider mb-1"><TrendingUp className="size-3" /> Avg Order Value</div>
          <div className="text-2xl font-semibold">{formatBDT(avg)}</div>
        </div>
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-amber-700 text-[10px] uppercase tracking-wider mb-1"><Clock className="size-3" /> Pending</div>
          <div className="text-2xl font-semibold text-amber-700">{totals.pending}</div>
        </div>
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-emerald-700 text-[10px] uppercase tracking-wider mb-1"><CheckCircle2 className="size-3" /> Successful</div>
          <div className="text-2xl font-semibold text-emerald-700">{totals.successful}</div>
        </div>
      </div>

      <div className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by order ID, customer or email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-2xl px-3 py-1.5 text-xs font-medium transition",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground hover:bg-surface-muted/80",
                )}
              >
                {s} {s !== "All" ? `(${s === "Pending" ? totals.pending : s === "Successful" ? totals.successful : totals.failed})` : ""}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {methods.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  "rounded-2xl px-3 py-1.5 text-xs font-medium transition",
                  method === m ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground hover:bg-surface-muted/80",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-muted-foreground text-sm text-center py-8">Loading payments…</p>}
        {error && <p className="text-rose-600 text-sm text-center py-2">{error}</p>}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground text-[11px] uppercase tracking-wide border-b border-border">
                <tr>
                  <th className="pb-2 pr-4">Order ID</th>
                  <th className="pr-4">Customer</th>
                  <th className="pr-4">Method</th>
                  <th className="pr-4">Payment status</th>
                  <th className="pr-4">Order status</th>
                  <th className="pr-4">Date</th>
                  <th className="pr-4 text-right">Amount</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-muted-foreground text-center py-8 text-sm">No payments found.</td>
                  </tr>
                )}
                {filtered.map((p) => {
                  const Icon = PAY_STATUS_ICON[p.paymentStatus];
                  return (
                    <tr key={p.orderId} className="border-t border-border hover:bg-surface-muted/30 transition">
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{p.orderId.slice(0, 12)}…</td>
                      <td className="pr-4">
                        <div className="font-medium">{p.customerName ?? "—"}</div>
                        <div className="text-muted-foreground text-[11px]">{p.customerEmail ?? ""}</div>
                      </td>
                      <td className="pr-4">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", PM_COLOR[p.method] ?? "bg-surface-muted text-foreground")}>{p.method ?? "—"}</span>
                      </td>
                      <td className="pr-4">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", PAY_STATUS_STYLE[p.paymentStatus])}>
                          <Icon className="size-3" /> {p.paymentStatus}
                        </span>
                      </td>
                      <td className="pr-4 text-muted-foreground text-xs">{p.orderStatus}</td>
                      <td className="pr-4 text-muted-foreground text-xs">{p.placedAt ? formatDay(p.placedAt) : "—"}</td>
                      <td className="pr-4 text-right font-semibold tabular-nums">{formatBDT(p.amount ?? 0)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {p.paymentStatus !== "Successful" && (
                            <button
                              disabled={updating === p.orderId}
                              onClick={() => updateStatus(p.orderId, "Successful")}
                              className="rounded-xl bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
                            >
                              Mark successful
                            </button>
                          )}
                          {p.paymentStatus !== "Failed" && (
                            <button
                              disabled={updating === p.orderId}
                              onClick={() => updateStatus(p.orderId, "Failed")}
                              className="rounded-xl bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-200 disabled:opacity-50"
                            >
                              Mark failed
                            </button>
                          )}
                          {p.paymentStatus !== "Pending" && (
                            <button
                              disabled={updating === p.orderId}
                              onClick={() => updateStatus(p.orderId, "Pending")}
                              className="rounded-xl bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
