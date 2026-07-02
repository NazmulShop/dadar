import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HardDrive, Download, RefreshCw, Trash2 } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/backup")({ component: BackupPage });

function BackupPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  function load() {
    adminFetch("backups").then(d => { if (Array.isArray(d)) setBackups(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function create() {
    setCreating(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/backups`, {
      method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` }
    });
    setCreating(false);
    if (res.ok) { const d = await res.json(); setBackups(b => [d, ...b]); toast.success("Backup created!"); }
    else toast.error("Backup failed");
  }

  async function remove(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/backups/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setBackups(b => b.filter(x => x.id !== id)); toast.success("Backup deleted"); }
  }

  async function restore(id: string) {
    if (!confirm("Restore this backup? Current data will be overwritten.")) return;
    const res = await fetch(`${API_ORIGIN}/api/admin/backups/${id}/restore`, {
      method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` }
    });
    if (res.ok) toast.success("Restore initiated"); else toast.error("Restore failed");
  }

  const STATUS_COLOR: Record<string, string> = { completed: "bg-emerald-100 text-emerald-800", failed: "bg-rose-100 text-rose-800", in_progress: "bg-blue-100 text-blue-800" };

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><HardDrive className="size-7 text-blue-600" /> Backup & Restore</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create database backups and restore to any point in time.</p>
          </div>
          <Button variant="hero" size="sm" onClick={create} disabled={creating}>
            <RefreshCw className={cn("size-4 mr-1", creating && "animate-spin")} />{creating ? "Creating…" : "Create Backup"}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Backups</div><div className="text-display mt-1 text-2xl font-semibold">{backups.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Latest Backup</div><div className="text-display mt-1 text-sm font-semibold">{backups[0]?.createdAt ? new Date(backups[0].createdAt).toLocaleString() : "Never"}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Size</div><div className="text-display mt-1 text-2xl font-semibold">{(backups.reduce((s, b) => s + (b.size ?? 0), 0) / 1024 / 1024).toFixed(1)} MB</div></div>
      </div>

      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">Backup History</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : backups.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No backups yet. Create your first backup above.</p>
        ) : (
          <div className="space-y-3">
            {backups.map(b => (
              <div key={b.id} className="border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{b.name ?? `Backup ${b.id?.slice(-8)}`}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"} · {b.size ? `${(b.size / 1024 / 1024).toFixed(2)} MB` : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLOR[b.status] ?? "bg-surface-muted text-foreground")}>{b.status ?? "completed"}</span>
                  {b.url && (
                    <a href={b.url} download className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-muted rounded-xl" title="Download">
                      <Download className="size-4" />
                    </a>
                  )}
                  <button onClick={() => restore(b.id)} className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-surface-muted rounded-xl" title="Restore">
                    <RefreshCw className="size-4" />
                  </button>
                  <button onClick={() => remove(b.id)} className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-surface-muted rounded-xl" title="Delete">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
