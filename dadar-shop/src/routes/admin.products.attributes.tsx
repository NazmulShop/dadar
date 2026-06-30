import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Tag, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/attributes")({ component: AttributesPage });

function AttributesPage() {
  const [attrs, setAttrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newValues, setNewValues] = useState("");

  useEffect(() => {
    adminFetch<any[]>("attributes")
      .then(d => { setAttrs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function add() {
    if (!newName.trim()) return;
    const values = newValues.split(",").map(v => v.trim()).filter(Boolean);
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name: newName.trim(), values }),
      });
      const d = await res.json();
      if (res.ok) { setAttrs(prev => [...prev, d]); setNewName(""); setNewValues(""); toast.success("Attribute added"); }
      else toast.error(d.error ?? "Failed");
    } catch { toast.error("Failed"); }
  }

  async function del(id: string) {
    if (!confirm("Delete attribute?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/attributes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setAttrs(prev => prev.filter(a => a.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Tag className="size-7" /> Product Attributes</h1>
        <p className="text-muted-foreground mt-1 text-sm">Define attributes like Size, Color, Material.</p>
      </header>
      <div className="surface-card rounded-3xl p-5 mb-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Attribute name (e.g. Size)" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-[180px]" />
          <Input placeholder="Values comma-separated (e.g. S,M,L,XL)" value={newValues} onChange={e => setNewValues(e.target.value)} className="max-w-xs" />
          <Button onClick={add} variant="brand" size="sm"><Plus className="size-4 mr-1" />Add</Button>
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          attrs.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No attributes yet.</div> : (
            <ul className="divide-y divide-border">
              {attrs.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted/40">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(a.values ?? []).map((v: string) => (
                        <span key={v} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">{v}</span>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => del(a.id)} className="text-rose-600"><Trash2 className="size-3" /></Button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </AdminLayout>
  );
}
