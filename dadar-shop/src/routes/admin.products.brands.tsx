import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Plus, Trash2, Pencil } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/brands")({ component: BrandsPage });

function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    adminFetch<any[]>("brands")
      .then(d => { setBrands(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function add() {
    if (!newName.trim()) return;
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const d = await res.json();
      if (res.ok) { setBrands(prev => [...prev, d]); setNewName(""); toast.success("Brand added"); }
      else toast.error(d.error ?? "Failed");
    } catch { toast.error("Failed"); }
  }

  async function update(id: string) {
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/brands/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) { setBrands(prev => prev.map(b => b.id === id ? { ...b, name: editName } : b)); setEditId(null); toast.success("Updated"); }
    } catch { toast.error("Failed"); }
  }

  async function del(id: string) {
    if (!confirm("Delete brand?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/brands/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setBrands(prev => prev.filter(b => b.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Boxes className="size-7" /> Brands</h1>
      </header>
      <div className="surface-card rounded-3xl p-5 mb-4">
        <div className="flex gap-2">
          <Input placeholder="New brand name…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} className="max-w-sm" />
          <Button onClick={add} variant="brand" size="sm"><Plus className="size-4 mr-1" />Add</Button>
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          brands.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No brands yet.</div> : (
            <ul className="divide-y divide-border">
              {brands.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted/40">
                  {editId === b.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="max-w-xs h-8" />
                      <Button size="sm" onClick={() => update(b.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <div><div className="font-medium">{b.name}</div><div className="text-xs text-muted-foreground font-mono">{b.id}</div></div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditId(b.id); setEditName(b.name); }}><Pencil className="size-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => del(b.id)} className="text-rose-600"><Trash2 className="size-3" /></Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>
    </AdminLayout>
  );
}
