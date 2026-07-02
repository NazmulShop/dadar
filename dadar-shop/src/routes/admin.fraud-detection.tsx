import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, ShieldCheck, ShieldX } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { formatBDT, formatDay } from "@/data/account";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/fraud-detection")({ component: FraudDetectionPage });

function FraudDetectionPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("fraud-flags").then(d => { if (Array.isArray(d)) setFlags(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function resolve(id: string, action: "cleared" | "blocked") {
    const res = await fetch(`${API_ORIGIN}/api/admin/fraud-flags/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ status: action }),
    });
    if (res.ok) { setFlags(f => f.map(x => x.id === id ? { ...x, status: action } : x)); toast.success(action === "cleared" ? "Flag cleared" : "User blocked"); }
    else toast.error("Failed");
  }

  const RISK_COLOR = { high: "bg-rose-100 text-rose-800", medium: "bg-amber-100 text-amber-800", low: "bg-blue-100 text-blue-800" };

  const counts = {
    high: flags.filter(f => f.riskLevel === "high" && f.status === "pending").length,
    medium: flags.filter(f => f.riskLevel === "medium" && f.status === "pending").length,
    total: flags.filter(f => f.status === "pending").length,
  };

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><AlertOctagon className="size-7 text-rose-600" /> Fraud Detection</h1>
        <p className="text-muted-foreground mt-1 text-sm">Review suspicious orders and flagged accounts.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Pending Review</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{counts.total}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">High Risk</div><div className="text-display mt-1 text-2xl font-semibold text-rose-700">{counts.high}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Medium Risk</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{counts.medium}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Blocked Users</div><div className="text-display mt-1 text-2xl font-semibold">{flags.filter(f => f.status === "blocked").length}</div></div>
      </div>

      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">Fraud Alerts</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : flags.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck className="size-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No fraud flags detected. Your shop looks clean!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map(f => (
              <div key={f.id} className={cn("border border-border rounded-2xl p-4", f.status !== "pending" && "opacity-60")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{f.reason ?? "Suspicious activity"}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", RISK_COLOR[f.riskLevel as keyof typeof RISK_COLOR] ?? "bg-surface-muted")}>{f.riskLevel?.toUpperCase()} RISK</span>
                    </div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {f.customerName} · {f.orderId ? `Order #${f.orderId}` : ""} · {formatBDT(f.amount ?? 0)}
                    </div>
                    <div className="text-muted-foreground text-[10px] mt-0.5">{f.flaggedAt ? formatDay(f.flaggedAt) : ""} · {f.ipAddress}</div>
                    {f.details && <p className="text-xs mt-1 text-foreground">{f.details}</p>}
                  </div>
                  {f.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => resolve(f.id, "cleared")} className="text-emerald-600 border-emerald-200">
                        <ShieldCheck className="size-3.5 mr-1" />Clear
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolve(f.id, "blocked")} className="text-rose-600 border-rose-200">
                        <ShieldX className="size-3.5 mr-1" />Block
                      </Button>
                    </div>
                  )}
                  {f.status !== "pending" && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", f.status === "cleared" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>{f.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
