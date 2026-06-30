import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layers, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/subcategories")({ component: SubcategoriesPage });

function SubcategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [subcats, setSubcats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    Promise.all([
      adminFetch<any[]>("categories"),
      adminFetch<any[]>("subcategories").catch(() => []),
    ]).then(([c, s]) => { setCats(Array.isArray(c) ? c : []); setSubcats(Array.isArray(s) ? s : []); setLoading(false); });
  }, []);

  async function add() {
    if (!newName.trim() || !parentId) { toast.error("Fill all fields"); return; }
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name: newName.trim(), categoryId: parentId }),
      });
      const d = await res.json();
      if (res.ok) { setSubcats(prev => [...prev, d]); setNewName(""); toast.success("Added"); }
      else toast.error(d.error ?? "Failed");
    } catch { toast.error("Failed"); }
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/subcategories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setSubcats(prev => prev.filter(s => s.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Layers className="size-7" /> Subcategories</h1>
      </header>
      <div className="surface-card rounded-3xl p-5 mb-4">
        <div className="flex flex-wrap gap-2">
          <select className="rounded-lg border border-border bg-background px-3 text-sm h-9" value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">Select category…</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input placeholder="Subcategory name…" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-xs" />
          <Button onClick={add} variant="brand" size="sm"><Plus className="size-4 mr-1" />Add</Button>
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> : subcats.length === 0 ?
          <div className="py-12 text-center text-muted-foreground text-sm">No subcategories yet.</div> : (
            <ul className="divide-y divide-border">
              {subcats.map(s => {
                const parent = cats.find(c => c.id === s.categoryId);
                return (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-muted/40">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{parent?.name ?? s.categoryId}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => del(s.id)} className="text-rose-600"><Trash2 className="size-3" /></Button>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </AdminLayout>
  );
}
