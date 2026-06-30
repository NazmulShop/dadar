import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, Plus, Trash2, Edit2, Save } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pages")({ component: PagesPage });

function PagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", content: "", published: true });

  useEffect(() => {
    adminFetch("pages")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setPages(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.title || !form.slug) { toast.error("Title and slug required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/pages`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { const d = await res.json(); setPages(p => [d, ...p]); toast.success("Page created"); setShowForm(false); setForm({ title: "", slug: "", content: "", published: true }); }
    else toast.error("Failed");
  }

  async function save() {
    if (!editing) return;
    const res = await fetch(`${API_ORIGIN}/api/admin/pages/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(editing),
    });
    if (res.ok) { setPages(p => p.map(x => x.id === editing.id ? editing : x)); toast.success("Page saved"); setEditing(null); }
    else toast.error("Failed");
  }

  async function remove(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/pages/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setPages(p => p.filter(x => x.id !== id)); toast.success("Page deleted"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Globe className="size-7 text-blue-600" /> Pages (CMS)</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage static pages like About, Privacy Policy, Terms.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> New Page</Button>
        </div>
      </header>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Create Page</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Title</Label><Input className="mt-1" placeholder="About Us" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input className="mt-1" placeholder="about-us" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} /></div>
            <div className="sm:col-span-2"><Label>Content</Label>
              <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-40 resize-none" placeholder="Page content (HTML or Markdown)…" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={create}>Create</Button><Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}

      {editing && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Edit: {editing.title}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Title</Label><Input className="mt-1" value={editing.title} onChange={e => setEditing((ed: any) => ({ ...ed, title: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input className="mt-1" value={editing.slug} onChange={e => setEditing((ed: any) => ({ ...ed, slug: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label>Content</Label>
              <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-48 resize-none" value={editing.content ?? ""} onChange={e => setEditing((ed: any) => ({ ...ed, content: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={save}><Save className="size-4 mr-1" />Save</Button><Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : pages.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No pages yet.</p>
        ) : (
          <div className="space-y-2">
            {pages.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 border border-border rounded-2xl px-4 py-3">
                <div>
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-muted-foreground text-xs">/{p.slug}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", p.published ? "bg-emerald-100 text-emerald-800" : "bg-surface-muted text-muted-foreground")}>{p.published ? "Published" : "Draft"}</span>
                  <button onClick={() => setEditing(p)} className="p-1.5 hover:bg-surface-muted rounded-xl text-muted-foreground"><Edit2 className="size-4" /></button>
                  <button onClick={() => remove(p.id)} className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-surface-muted rounded-xl"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
