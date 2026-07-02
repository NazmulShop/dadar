import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Image, Upload, Trash2, Copy, Search } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/media")({ component: MediaPage });

function MediaPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminFetch("media").then(d => { if (Array.isArray(d)) setFiles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const formData = new FormData(); formData.append("file", f);
    const res = await fetch(`${API_ORIGIN}/api/admin/media/upload`, {
      method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` }, body: formData,
    });
    setUploading(false);
    if (res.ok) { const d = await res.json(); setFiles(fs => [d, ...fs]); toast.success("File uploaded!"); }
    else toast.error("Upload failed");
  }

  async function remove(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/media/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
    if (res.ok) { setFiles(f => f.filter(x => x.id !== id)); toast.success("Deleted"); }
    else toast.error("Delete failed");
  }

  const filtered = files.filter(f => !q || (f.filename ?? f.name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Image className="size-7 text-violet-600" /> Media Library</h1>
            <p className="text-muted-foreground mt-1 text-sm">Upload and manage images and files for your shop.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="size-4" />{uploading ? "Uploading…" : "Upload File"}
          </Button>
          <input ref={inputRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={upload} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Files</div><div className="text-display mt-1 text-2xl font-semibold">{files.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Images</div><div className="text-display mt-1 text-2xl font-semibold">{files.filter(f => (f.type ?? "").startsWith("image")).length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Size</div><div className="text-display mt-1 text-2xl font-semibold">{(files.reduce((s, f) => s + (f.size ?? 0), 0) / 1024 / 1024).toFixed(1)} MB</div></div>
      </div>

      <div className="surface-card rounded-3xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search files…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Upload className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No files yet. Upload your first image above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(f => (
              <div key={f.id} className="group relative rounded-2xl overflow-hidden border border-border bg-surface-muted aspect-square">
                {(f.type ?? "").startsWith("image") || f.url?.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                  <img src={f.url} alt={f.filename ?? f.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="size-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(f.url ?? ""); toast.success("URL copied!"); }}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-1.5 text-xs flex items-center gap-1">
                    <Copy className="size-3" /> Copy URL
                  </button>
                  <button onClick={() => remove(f.id)}
                    className="bg-rose-500/80 hover:bg-rose-500 text-white rounded-xl px-3 py-1.5 text-xs flex items-center gap-1">
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-white text-[9px] truncate">{f.filename ?? f.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
