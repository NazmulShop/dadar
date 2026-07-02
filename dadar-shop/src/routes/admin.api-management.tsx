import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Puzzle, Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/api-management")({ component: ApiManagementPage });

function ApiManagementPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", permissions: "read" });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    adminFetch("api-keys").then(d => { if (Array.isArray(d)) setKeys(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.name) { toast.error("Name required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/api-keys`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { const d = await res.json(); setKeys(k => [d, ...k]); toast.success("API key created"); setShowForm(false); }
    else toast.error("Failed");
  }

  async function revoke(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/api-keys/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setKeys(k => k.filter(x => x.id !== id)); toast.success("Key revoked"); }
    else toast.error("Failed");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Puzzle className="size-7 text-violet-600" /> API Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage API keys for external integrations.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> Generate Key</Button>
        </div>
      </header>

      <div className="surface-card rounded-3xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-2">API Base URL</h3>
        <div className="flex items-center gap-2 bg-surface-muted rounded-2xl px-4 py-3">
          <code className="text-sm flex-1 truncate">{API_ORIGIN}/api</code>
          <button onClick={() => { navigator.clipboard.writeText(`${API_ORIGIN}/api`); toast.success("Copied!"); }} className="shrink-0 text-muted-foreground hover:text-foreground"><Copy className="size-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Include your API key as <code>Authorization: Bearer &lt;key&gt;</code> header in all requests.</p>
      </div>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Generate API Key</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Key Name</Label><Input className="mt-1" placeholder="Mobile App Key" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Permissions</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={form.permissions} onChange={e => setForm(f => ({ ...f, permissions: e.target.value }))}>
                <option value="read">Read Only</option>
                <option value="write">Read & Write</option>
                <option value="admin">Full Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={create}>Generate</Button><Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">API Keys</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : keys.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No API keys yet.</p>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <div key={k.id} className={cn("border border-border rounded-2xl p-4", !k.active && "opacity-60")}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="font-semibold text-sm">{k.name}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{k.permissions} · Created {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", k.active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>{k.active ? "Active" : "Revoked"}</span>
                    {k.active && <button onClick={() => revoke(k.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="size-4" /></button>}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 bg-surface-muted rounded-xl px-3 py-2">
                  <code className="text-xs flex-1 truncate">{revealed[k.id] ? k.key : (k.key ? k.key.slice(0, 8) + "•".repeat(24) : "••••••••••••••••••••••••••••••••")}</code>
                  <button onClick={() => setRevealed(r => ({ ...r, [k.id]: !r[k.id] }))} className="text-muted-foreground hover:text-foreground shrink-0">
                    {revealed[k.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(k.key ?? ""); toast.success("Copied!"); }} className="text-muted-foreground hover:text-foreground shrink-0"><Copy className="size-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
