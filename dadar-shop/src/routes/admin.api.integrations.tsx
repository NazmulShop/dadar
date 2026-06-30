import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plug, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/api/integrations")({ component: IntegrationsPage });

function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<any[]>("integrations")
      .then(d => { setIntegrations(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggle(id: string, enabled: boolean) {
    try {
      await fetch(`${API_ORIGIN}/api/admin/integrations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ enabled }),
      });
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, enabled } : i));
      toast.success(enabled ? "Integration enabled" : "Integration disabled");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Plug className="size-7 text-violet-600" /> Third-party Integrations</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage external service integrations.</p>
      </header>
      {loading ? <div className="surface-card rounded-3xl py-12 text-center text-muted-foreground text-sm">Loading…</div> :
        integrations.length === 0 ? (
          <div className="surface-card rounded-3xl py-12 text-center text-muted-foreground text-sm">
            No integrations configured. Contact your developer to add integrations.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {integrations.map(integ => (
              <div key={integ.id} className="surface-card rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold">{integ.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{integ.description ?? integ.type}</div>
                  </div>
                  <button onClick={() => toggle(integ.id, !integ.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${integ.enabled ? "bg-emerald-500" : "bg-surface-muted"}`}>
                    <span className={`inline-block size-4 rounded-full bg-white shadow transition ${integ.enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {integ.enabled ? <CheckCircle2 className="size-3 text-emerald-600" /> : <XCircle className="size-3 text-muted-foreground" />}
                  <span className={integ.enabled ? "text-emerald-700" : "text-muted-foreground"}>{integ.enabled ? "Active" : "Inactive"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </AdminLayout>
  );
}
