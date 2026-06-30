import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Search, CheckCircle2, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { formatBDT, formatDay } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders/returns")({ component: ReturnsPage });

function ReturnsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminFetch<any[]>("refunds")
      .then(d => { setRefunds(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    refunds.filter(r => !q || r.id?.toLowerCase().includes(q.toLowerCase()) || r.orderId?.toLowerCase().includes(q.toLowerCase())),
    [refunds, q]);

  async function approve(id: string) {
    try {
      await fetch(`${API_ORIGIN}/api/admin/refunds/${id}/approve`, {
        method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
      toast.success("Refund approved");
    } catch { toast.error("Failed"); }
  }

  async function reject(id: string) {
    try {
      await fetch(`${API_ORIGIN}/api/admin/refunds/${id}/reject`, {
        method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
      toast.success("Refund rejected");
    } catch { toast.error("Failed"); }
  }

  const pending = filtered.filter(r => r.status === "pending" || !r.status);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><RotateCcw className="size-7 text-violet-600" /> Returns & Refunds</h1>
        <p className="text-muted-foreground mt-1 text-sm">{loading ? "Loading…" : `${pending.length} pending · ${filtered.length} total`}</p>
      </header>
      <div className="surface-card mb-4 rounded-3xl p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by refund or order ID…" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          filtered.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No refund requests.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted">
                  <tr>{["Refund ID", "Order ID", "Amount", "Reason", "Status", "Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(r => {
                    const status = r.status ?? "pending";
                    const tone = status === "approved" ? "bg-emerald-100 text-emerald-800" : status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800";
                    return (
                      <tr key={r.id} className="hover:bg-surface-muted/40">
                        <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.orderId}</td>
                        <td className="px-4 py-3 font-semibold">{formatBDT(r.amount ?? 0)}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{r.reason ?? "—"}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{status}</span></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.createdAt ? formatDay(r.createdAt) : "—"}</td>
                        <td className="px-4 py-3">
                          {status === "pending" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => approve(r.id)} className="text-emerald-700"><CheckCircle2 className="size-3 mr-1" />Approve</Button>
                              <Button size="sm" variant="ghost" onClick={() => reject(r.id)} className="text-rose-700"><XCircle className="size-3 mr-1" />Reject</Button>
                            </div>
                          )}
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
