import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, Plus, Save, Trash2 } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/roles")({ component: RolesPage });

const ALL_PERMISSIONS = [
  "orders:read","orders:write","products:read","products:write","customers:read","customers:write",
  "sellers:read","sellers:write","analytics:read","settings:write","admins:write",
  "coupons:write","banners:write","refunds:write","reports:read",
];

function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", permissions: [] as string[] });

  useEffect(() => {
    adminFetch("roles").then(d => { if (Array.isArray(d)) setRoles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.name) { toast.error("Name required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/roles`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { const d = await res.json(); setRoles(r => [...r, d]); toast.success("Role created"); setShowForm(false); setForm({ name: "", permissions: [] }); }
    else toast.error("Failed");
  }

  async function saveRole() {
    if (!editing) return;
    const res = await fetch(`${API_ORIGIN}/api/admin/roles/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(editing),
    });
    if (res.ok) { setRoles(r => r.map(x => x.id === editing.id ? editing : x)); toast.success("Role saved"); setEditing(null); }
    else toast.error("Failed");
  }

  async function remove(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/roles/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setRoles(r => r.filter(x => x.id !== id)); toast.success("Role deleted"); }
  }

  function PermissionGrid({ perms, onChange }: { perms: string[]; onChange: (p: string[]) => void }) {
    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {ALL_PERMISSIONS.map(p => (
          <label key={p} className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={perms.includes(p)} onChange={e => onChange(e.target.checked ? [...perms, p] : perms.filter(x => x !== p))} className="rounded" />
            <code>{p}</code>
          </label>
        ))}
      </div>
    );
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Lock className="size-7 text-violet-600" /> Roles & Permissions</h1>
            <p className="text-muted-foreground mt-1 text-sm">Define admin roles and fine-grained permissions.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> New Role</Button>
        </div>
      </header>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Create Role</h3>
          <div><Label>Role Name</Label><Input className="mt-1 mb-3" placeholder="Support Agent" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <Label>Permissions</Label>
          <PermissionGrid perms={form.permissions} onChange={p => setForm(f => ({ ...f, permissions: p }))} />
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={create}>Create</Button><Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}

      {editing && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Edit Role: {editing.name}</h3>
          <PermissionGrid perms={editing.permissions ?? []} onChange={p => setEditing((e: any) => ({ ...e, permissions: p }))} />
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={saveRole}><Save className="size-4 mr-1" />Save</Button><Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : roles.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No custom roles yet. Default roles: super_admin, admin, support.</p>
        ) : (
          <div className="space-y-3">
            {roles.map(r => (
              <div key={r.id} className="border border-border rounded-2xl p-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(r.permissions ?? []).map((p: string) => (
                      <code key={p} className="bg-surface-muted rounded-full px-2 py-0.5 text-[10px]">{p}</code>
                    ))}
                    {(r.permissions ?? []).length === 0 && <span className="text-muted-foreground text-xs">No permissions assigned</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                  {!r.isSystem && <button onClick={() => remove(r.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="size-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
