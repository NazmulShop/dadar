import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, CheckCircle2, XCircle } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/data/account";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/disputes")({ component: DisputesPage });

function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("disputes")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setDisputes(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function resolve(id: string, resolution: "approved" | "rejected") {
    const res = await fetch(`${API_ORIGIN}/api/admin/disputes/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ status: resolution }),
    });
    if (res.ok) { setDisputes(d => d.map(x => x.id === id ? { ...x, status: resolution } : x)); toast.success(`Dispute ${resolution}`); }
  }

  const STATUS_COLOR: Record<string, string> = { pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-rose-100 text-rose-800" };

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><AlertOctagon className="size-7 text-rose-600" /> Disputes / Returns</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage customer disputes and return requests.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Pending</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{disputes.filter(d => d.status === "pending").length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Approved</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{disputes.filter(d => d.status === "approved").length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Rejected</div><div className="text-display mt-1 text-2xl font-semibold text-rose-700">{disputes.filter(d => d.status === "rejected").length}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : disputes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No disputes at this time.</p>
        ) : (
          <div className="space-y-3">
            {disputes.map(d => (
              <div key={d.id} className="border border-border rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm">{d.productName ?? "Order #" + d.orderId}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{d.customerName} · {d.reason}</div>
                    <div className="font-semibold text-primary mt-1">{formatBDT(d.amount ?? 0)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLOR[d.status] ?? "bg-surface-muted text-foreground")}>{d.status}</span>
                    {d.status === "pending" && (
                      <>
                        <button onClick={() => resolve(d.id, "approved")} className="text-emerald-600 hover:text-emerald-800" title="Approve"><CheckCircle2 className="size-5" /></button>
                        <button onClick={() => resolve(d.id, "rejected")} className="text-rose-500 hover:text-rose-700" title="Reject"><XCircle className="size-5" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
