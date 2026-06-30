import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Store, CheckCircle2, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vendors/pending")({ component: PendingVendorsPage });

function PendingVendorsPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<any[]>("sellers")
      .then(d => { setSellers(Array.isArray(d) ? d.filter((s: any) => s.status === "Pending") : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function approve(id: string) {
    try {
      await fetch(`${API_ORIGIN}/api/admin/sellers/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ status: "Active" }),
      });
      setSellers(prev => prev.filter(s => s.id !== id));
      toast.success("Vendor approved");
    } catch { toast.error("Failed"); }
  }

  async function reject(id: string) {
    try {
      await fetch(`${API_ORIGIN}/api/admin/sellers/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ status: "Suspended" }),
      });
      setSellers(prev => prev.filter(s => s.id !== id));
      toast.success("Vendor rejected");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Store className="size-7 text-amber-600" /> Pending Vendor Approval</h1>
        <p className="text-muted-foreground mt-1 text-sm">{loading ? "…" : `${sellers.length} vendors awaiting approval.`}</p>
      </header>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div> :
          sellers.length === 0 ? <div className="py-16 text-center text-muted-foreground text-sm">No pending vendors 🎉</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted">
                  <tr>{["Shop", "Owner", "Products", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sellers.map(s => (
                    <tr key={s.id} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-3 font-medium">{s.shop}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.owner}</td>
                      <td className="px-4 py-3">{s.products ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => approve(s.id)} className="text-emerald-700 border-emerald-300">
                            <CheckCircle2 className="size-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => reject(s.id)} className="text-rose-700">
                            <XCircle className="size-3 mr-1" />Reject
                          </Button>
                        </div>
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
