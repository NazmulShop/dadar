import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star, CheckCircle2, XCircle, Flag } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"Pending" | "Published" | "Rejected" | "Reported">("Pending");

  useEffect(() => {
    adminFetch("reviews").then(d => { if (Array.isArray(d)) setReviews(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    if (tab === "Reported") return reviews.filter(r => (r.reports ?? 0) > 0);
    return reviews.filter(r => r.status === tab);
  }, [reviews, tab]);

  async function setStatus(id: string, status: string) {
    const prev = reviews.find(r => r.id === id)?.status;
    setReviews(l => l.map(r => r.id === id ? { ...r, status } : r));
    const res = await fetch(`${API_ORIGIN}/api/admin/reviews/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { setReviews(l => l.map(r => r.id === id ? { ...r, status: prev } : r)); toast.error("Update failed"); }
    else toast.success(`Review ${status.toLowerCase()}`);
  }

  const counts = {
    Pending: reviews.filter(r => r.status === "Pending").length,
    Published: reviews.filter(r => r.status === "Published").length,
    Rejected: reviews.filter(r => r.status === "Rejected").length,
    Reported: reviews.filter(r => (r.reports ?? 0) > 0).length,
  };

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Star className="size-7" /> Reviews & Ratings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Moderate customer reviews and track product ratings.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        {([["Pending", "warn"], ["Published", "success"], ["Rejected", ""], ["Reported", "warn"]] as const).map(([k, tone]) => (
          <div key={k} className="surface-card rounded-3xl p-4">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{k}</div>
            <div className={cn("text-display mt-1 text-2xl font-semibold", tone === "success" && "text-emerald-700", tone === "warn" && "text-amber-700")}>{counts[k]}</div>
          </div>
        ))}
      </div>

      <div className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            {(["Pending", "Published", "Rejected", "Reported"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("rounded-2xl px-3 py-1.5 text-xs font-medium", tab === t ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground")}>
                {t} ({counts[t]})
              </button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">Avg rating: <span className="font-semibold text-amber-600">★ {avgRating}</span></div>
        </div>

        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : (
          <ul className="space-y-3">
            {list.length === 0 && <li className="text-muted-foreground py-6 text-center text-sm">Nothing in this queue.</li>}
            {list.map(r => (
              <li key={r.id} className="border border-border rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{r.productName}</div>
                    <div className="text-muted-foreground mt-0.5 text-[11px]">
                      {r.authorName} · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                      {(r.reports ?? 0) > 0 && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-rose-600">
                          <Flag className="size-3" /> {r.reports} report{r.reports !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs">{r.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {r.status !== "Published" && (
                      <button onClick={() => setStatus(r.id, "Published")} className="text-emerald-600 hover:text-emerald-800" title="Publish"><CheckCircle2 className="size-5" /></button>
                    )}
                    {r.status !== "Rejected" && (
                      <button onClick={() => setStatus(r.id, "Rejected")} className="text-rose-500 hover:text-rose-700" title="Reject"><XCircle className="size-5" /></button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
