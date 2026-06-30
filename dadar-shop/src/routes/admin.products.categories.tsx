import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolderTree, Plus, Pencil, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    adminFetch<any[]>("categories")
      .then(d => { setCats(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function add() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const d = await res.json();
      if (res.ok) { setCats(prev => [...prev, d]); setNewName(""); toast.success("Category added"); }
      else toast.error(d.error ?? "Failed");
    } catch { toast.error("Failed"); }
    setAdding(false);
  }

  async function update(id: string) {
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) { setCats(prev => prev.map(c => c.id === id ? { ...c, name: editName } : c)); setEditId(null); toast.success("Updated"); }
      else toast.error("Failed");
    } catch { toast.error("Failed"); }
  }

  async function del(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setCats(prev => prev.filter(c => c.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><FolderTree className="size-7" /> Product Categories</h1>
        <p className="text-muted-foreground mt-1 text-sm">Add, edit, or delete product categories.</p>
      </header>
      <div className="surface-card rounded-3xl p-5 mb-4">
        <div className="flex gap-2">
          <Input placeholder="New category name…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} className="max-w-sm" />
          <Button onClick={add} disabled={adding} variant="brand" size="sm"><Plus className="size-4 mr-1" />Add</Button>
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div> :
          cats.length === 0 ? <div className="py-16 text-center text-muted-foreground text-sm">No categories yet.</div> : (
            <ul className="divide-y divide-border">
              {cats.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted/40">
                  {editId === c.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="max-w-xs h-8" />
                      <Button size="sm" onClick={() => update(c.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{c.id}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditId(c.id); setEditName(c.name); }}><Pencil className="size-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => del(c.id)} className="text-rose-600"><Trash2 className="size-3" /></Button>
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
