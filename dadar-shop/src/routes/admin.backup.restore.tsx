import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DatabaseBackup, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { formatDay } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/backup/restore")({ component: RestorePage });

function RestorePage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<any[]>("backups")
      .then(d => { setBackups(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function restore(id: string) {
    if (!confirm("⚠️ Restoring will overwrite current data. Are you sure?")) return;
    setRestoring(id);
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/backups/${id}/restore`, {
        method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (res.ok) toast.success("Restore initiated successfully");
      else { const d = await res.json(); toast.error(d.error ?? "Restore failed"); }
    } catch { toast.error("Failed"); }
    setRestoring(null);
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><DatabaseBackup className="size-7 text-amber-600" /> Restore from Backup</h1>
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-amber-800 text-xs">Restoring will overwrite all current data with the selected backup. This action cannot be undone.</p>
        </div>
      </header>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading backups…</div> :
          backups.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No backups available.</div> : (
            <ul className="divide-y divide-border">
              {backups.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <div className="font-medium text-sm">{b.name ?? `Backup #${b.id}`}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {b.createdAt ? formatDay(b.createdAt) : "—"} · {b.size ? `${(b.size / 1024).toFixed(1)} KB` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status === "complete" && <CheckCircle2 className="size-4 text-emerald-600" />}
                    <Button variant="outline" size="sm" onClick={() => restore(b.id)} disabled={restoring === b.id} className="text-amber-700 border-amber-300">
                      <Upload className="size-3 mr-1" />{restoring === b.id ? "Restoring…" : "Restore"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
    </AdminLayout>
  );
}
