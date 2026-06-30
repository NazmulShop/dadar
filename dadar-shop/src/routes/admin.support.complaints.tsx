import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareWarning, Search, CheckCircle2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { formatDay } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/support/complaints")({ component: ComplaintsPage });

function ComplaintsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminFetch<any[]>("support-tickets")
      .then(d => { setTickets(Array.isArray(d) ? d.filter((t: any) => t.category === "complaint" || t.subject?.toLowerCase().includes("complaint")) : []); setLoading(false); })
      .catch(() => {
        adminFetch<any[]>("support-tickets")
          .then(d => { setTickets(Array.isArray(d) ? d : []); setLoading(false); })
          .catch(() => setLoading(false));
      });
  }, []);

  const filtered = useMemo(() =>
    tickets.filter(t => !q || t.subject?.toLowerCase().includes(q.toLowerCase()) || t.id?.toLowerCase().includes(q.toLowerCase())),
    [tickets, q]);

  async function resolve(id: string) {
    try {
      await fetch(`${API_ORIGIN}/api/admin/support-tickets/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ status: "resolved" }),
      });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "resolved" } : t));
      toast.success("Marked as resolved");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><MessageSquareWarning className="size-7 text-rose-600" /> Complaints</h1>
        <p className="text-muted-foreground mt-1 text-sm">Customer complaints requiring attention.</p>
      </header>
      <div className="surface-card mb-4 rounded-3xl p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search complaints…" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          filtered.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No complaints found.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted">
                  <tr>{["ID", "Subject", "User", "Priority", "Status", "Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(t => {
                    const status = t.status ?? "open";
                    const sTone = status === "resolved" ? "bg-emerald-100 text-emerald-800" : status === "closed" ? "bg-slate-100 text-slate-700" : "bg-rose-100 text-rose-800";
                    return (
                      <tr key={t.id} className="hover:bg-surface-muted/40">
                        <td className="px-4 py-3 font-mono text-xs">{t.id}</td>
                        <td className="px-4 py-3 font-medium max-w-[200px] truncate">{t.subject ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{t.userName ?? t.userId ?? "—"}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.priority === "high" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{t.priority ?? "normal"}</span></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sTone}`}>{status}</span></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{t.createdAt ? formatDay(t.createdAt) : "—"}</td>
                        <td className="px-4 py-3">
                          {status !== "resolved" && (
                            <Button size="sm" variant="ghost" onClick={() => resolve(t.id)} className="text-emerald-700"><CheckCircle2 className="size-3 mr-1" />Resolve</Button>
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
