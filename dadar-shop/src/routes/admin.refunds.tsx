import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCcw, CheckCircle2, XCircle } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatBDT, formatDay } from "@/data/account";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/refunds")({ component: RefundsPage });

function RefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("refunds").then(d => { if (Array.isArray(d)) setRefunds(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function process(id: string, status: "Completed" | "Rejected") {
    const prev = refunds.find(r => r.id === id)?.status;
    setRefunds(r => r.map(x => x.id === id ? { ...x, status } : x));
    const res = await fetch(`${API_ORIGIN}/api/admin/refunds/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) toast.success(`Refund ${status.toLowerCase()}`);
    else { setRefunds(r => r.map(x => x.id === id ? { ...x, status: prev } : x)); toast.error("Update failed"); }
  }

  const STATUS_COLOR: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-800",
    Completed: "bg-emerald-100 text-emerald-800",
    Rejected: "bg-rose-100 text-rose-800",
  };

  const totalPending = refunds.filter(r => r.status === "Pending").reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalCompleted = refunds.filter(r => r.status === "Completed").reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><RefreshCcw className="size-7 text-violet-600" /> Refund Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">Process and track customer refund requests.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Pending</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{refunds.filter(r => r.status === "Pending").length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Pending Amount</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{formatBDT(totalPending)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Completed</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{refunds.filter(r => r.status === "Completed").length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Refunded</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{formatBDT(totalCompleted)}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : refunds.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No refund requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
                <tr><th className="py-2 pr-4">Order</th><th className="pr-4">Product</th><th className="pr-4">Reason</th><th className="pr-4">Method</th><th className="pr-4">Date</th><th className="pr-4">Status</th><th className="text-right pr-4">Amount</th><th></th></tr>
              </thead>
              <tbody>
                {refunds.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 pr-4 font-mono text-xs">{r.orderId}</td>
                    <td className="pr-4">{r.productName}</td>
                    <td className="pr-4 text-muted-foreground text-xs">{r.reason}</td>
                    <td className="pr-4 text-muted-foreground text-xs">{r.method}</td>
                    <td className="pr-4 text-muted-foreground text-xs">{r.createdAt ? formatDay(r.createdAt) : "—"}</td>
                    <td className="pr-4"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLOR[r.status] ?? "bg-surface-muted")}>{r.status}</span></td>
                    <td className="text-right pr-4 font-semibold tabular-nums">{formatBDT(r.amount ?? 0)}</td>
                    <td>
                      {r.status === "Pending" && (
                        <div className="flex gap-1">
                          <button onClick={() => process(r.id, "Completed")} className="text-emerald-600 hover:text-emerald-800" title="Approve"><CheckCircle2 className="size-4" /></button>
                          <button onClick={() => process(r.id, "Rejected")} className="text-rose-500 hover:text-rose-700" title="Reject"><XCircle className="size-4" /></button>
                        </div>
                      )}
                    </td>
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
