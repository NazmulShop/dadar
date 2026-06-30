import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { User, LogOut, Shield } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login-sessions")({ component: LoginSessionsPage });

function LoginSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("login-sessions")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setSessions(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function revoke(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/login-sessions/${id}/revoke`, {
      method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` }
    });
    if (res.ok) { setSessions(s => s.map(x => x.id === id ? { ...x, active: false } : x)); toast.success("Session revoked"); }
    else toast.error("Failed");
  }

  async function revokeAll() {
    const res = await fetch(`${API_ORIGIN}/api/admin/login-sessions/revoke-all`, {
      method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` }
    });
    if (res.ok) { setSessions(s => s.map(x => ({ ...x, active: false }))); toast.success("All sessions revoked"); }
    else toast.error("Failed");
  }

  const active = sessions.filter(s => s.active).length;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><User className="size-7 text-blue-600" /> Login Sessions</h1>
            <p className="text-muted-foreground mt-1 text-sm">View and manage all active admin login sessions.</p>
          </div>
          {active > 1 && <Button variant="outline" size="sm" onClick={revokeAll} className="text-rose-600 border-rose-200"><LogOut className="size-4 mr-1" />Revoke All</Button>}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Active Sessions</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{active}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Revoked</div><div className="text-display mt-1 text-2xl font-semibold text-rose-700">{sessions.filter(s => !s.active).length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total</div><div className="text-display mt-1 text-2xl font-semibold">{sessions.length}</div></div>
      </div>

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No login sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className={cn("border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3", !s.active && "opacity-50")}>
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-surface-muted flex items-center justify-center">
                    <Shield className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{s.adminName ?? s.email}</div>
                    <div className="text-muted-foreground text-xs">{s.ip ?? "Unknown IP"} · {s.device ?? s.userAgent?.slice(0, 40) ?? "Unknown device"}</div>
                    <div className="text-muted-foreground text-[10px]">Logged in: {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", s.active ? "bg-emerald-100 text-emerald-800" : "bg-surface-muted text-muted-foreground")}>
                    {s.active ? "Active" : "Revoked"}
                  </span>
                  {s.active && !s.isCurrent && (
                    <button onClick={() => revoke(s.id)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-surface-muted rounded-xl" title="Revoke">
                      <LogOut className="size-4" />
                    </button>
                  )}
                  {s.isCurrent && <span className="text-[10px] text-primary font-semibold">Current</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
