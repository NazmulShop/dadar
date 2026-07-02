import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Plus, Trash2, Edit2, Save } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog")({ component: BlogPage });

function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", published: false, category: "news" });

  useEffect(() => {
    adminFetch("blog").then(d => { if (Array.isArray(d)) setPosts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.title) { toast.error("Title required"); return; }
    const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const res = await fetch(`${API_ORIGIN}/api/admin/blog`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ ...form, slug }),
    });
    if (res.ok) { const d = await res.json(); setPosts(p => [d, ...p]); toast.success("Post created"); setShowForm(false); }
    else toast.error("Failed");
  }

  async function save() {
    if (!editing) return;
    const res = await fetch(`${API_ORIGIN}/api/admin/blog/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(editing),
    });
    if (res.ok) { setPosts(p => p.map(x => x.id === editing.id ? editing : x)); toast.success("Post saved"); setEditing(null); }
    else toast.error("Failed");
  }

  async function remove(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/blog/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setPosts(p => p.filter(x => x.id !== id)); toast.success("Post deleted"); }
  }

  const CATEGORIES = ["news", "guides", "style", "deals", "announcements"];

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><BookOpen className="size-7 text-amber-600" /> Blog / Articles</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create and manage blog posts and articles.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> New Post</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Posts</div><div className="text-display mt-1 text-2xl font-semibold">{posts.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Published</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{posts.filter(p => p.published).length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Drafts</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{posts.filter(p => !p.published).length}</div></div>
      </div>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">New Blog Post</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Title</Label><Input className="mt-1" placeholder="5 Tips for Shopping…" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm capitalize" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label>Excerpt</Label><Input className="mt-1" placeholder="Brief summary…" value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label>Content</Label>
              <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-40 resize-none" placeholder="Full article content…" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="pub" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
              <Label htmlFor="pub">Publish immediately</Label>
            </div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={create}>Create Post</Button><Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}

      {editing && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Edit Post</h3>
          <div className="grid gap-3">
            <div><Label>Title</Label><Input className="mt-1" value={editing.title} onChange={e => setEditing((ed: any) => ({ ...ed, title: e.target.value }))} /></div>
            <div><Label>Content</Label><textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-48 resize-none" value={editing.content ?? ""} onChange={e => setEditing((ed: any) => ({ ...ed, content: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={save}><Save className="size-4 mr-1" />Save</Button><Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : posts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No blog posts yet.</p>
        ) : (
          <div className="space-y-2">
            {posts.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 border border-border rounded-2xl px-4 py-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{p.title}</div>
                  <div className="text-muted-foreground text-xs capitalize">{p.category} · {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", p.published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{p.published ? "Published" : "Draft"}</span>
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
