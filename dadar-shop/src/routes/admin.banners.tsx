import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Image, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/banners")({ component: BannersPage });

function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", imageUrl: "", linkUrl: "", position: "hero", active: true });

  useEffect(() => {
    adminFetch("banners")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setBanners(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function createBanner() {
    if (!form.title || !form.imageUrl) { toast.error("Title and image URL required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/banners`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const d = await res.json();
      setBanners(b => [d, ...b]);
      toast.success("Banner created"); setShowForm(false);
      setForm({ title: "", imageUrl: "", linkUrl: "", position: "hero", active: true });
    } else toast.error("Failed to create banner");
  }

  async function toggleBanner(id: string, active: boolean) {
    const res = await fetch(`${API_ORIGIN}/api/admin/banners/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) { setBanners(b => b.map(x => x.id === id ? { ...x, active: !active } : x)); toast.success("Banner updated"); }
  }

  async function deleteBanner(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/banners/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setBanners(b => b.filter(x => x.id !== id)); toast.success("Deleted"); }
  }

  const POSITIONS = ["hero", "sidebar", "popup", "topbar", "category"];

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Image className="size-7" /> Banners</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage promotional banners shown across the storefront.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> New Banner</Button>
        </div>
      </header>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Create Banner</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Title</Label><Input className="mt-1" placeholder="Eid Sale Banner" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Position</Label>
              <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm capitalize" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
                {POSITIONS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label>Image URL</Label><Input className="mt-1" placeholder="https://…/banner.jpg" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label>Link URL</Label><Input className="mt-1" placeholder="https://…/sale" value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="hero" size="sm" onClick={createBanner}>Create</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : banners.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No banners yet.</p>
        ) : (
          <div className="space-y-3">
            {banners.map(b => (
              <div key={b.id} className={cn("border border-border rounded-2xl p-4 flex flex-wrap items-center gap-4", !b.active && "opacity-60")}>
                {b.imageUrl && (
                  <img src={b.imageUrl} alt={b.title} className="w-24 h-14 rounded-xl object-cover bg-surface-muted" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{b.title}</div>
                  <div className="text-muted-foreground text-xs mt-0.5 capitalize">{b.position} position</div>
                  {b.linkUrl && <div className="text-xs text-primary truncate mt-0.5">{b.linkUrl}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleBanner(b.id, b.active)} className="p-2 rounded-xl hover:bg-surface-muted">
                    {b.active ? <Eye className="size-4 text-emerald-600" /> : <EyeOff className="size-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteBanner(b.id)} className="text-rose-500 hover:text-rose-700 p-2 rounded-xl hover:bg-surface-muted"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
