import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Search, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { formatDay } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/logs/errors")({ component: ErrorLogsPage });

function ErrorLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminFetch<any[]>("error-logs")
      .then(d => { setLogs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    logs.filter(l => !q || (l.message ?? "").toLowerCase().includes(q.toLowerCase()) || (l.path ?? "").toLowerCase().includes(q.toLowerCase())),
    [logs, q]);

  async function clearAll() {
    if (!confirm("Clear all error logs?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/error-logs`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setLogs([]);
      toast.success("Logs cleared");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><AlertTriangle className="size-7 text-rose-600" /> Error Logs</h1>
            <p className="text-muted-foreground mt-1 text-sm">{loading ? "Loading…" : `${logs.length} error events recorded`}</p>
          </div>
          {logs.length > 0 && <Button variant="outline" size="sm" onClick={clearAll} className="text-rose-600"><Trash2 className="size-4 mr-1" />Clear All</Button>}
        </div>
      </header>
      <div className="surface-card mb-4 rounded-3xl p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search error logs…" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          filtered.length === 0 ? <div className="py-12 text-center text-emerald-700 text-sm font-medium">✓ No errors recorded</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted">
                  <tr>{["Level", "Message", "Path", "User", "Timestamp"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((l, i) => (
                    <tr key={l.id ?? i} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.level === "error" ? "bg-rose-100 text-rose-800" : l.level === "warn" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{l.level ?? "error"}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[300px]"><p className="truncate font-mono text-xs">{l.message ?? "—"}</p></td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.path ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.userId ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.timestamp ? formatDay(l.timestamp) : "—"}</td>
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
