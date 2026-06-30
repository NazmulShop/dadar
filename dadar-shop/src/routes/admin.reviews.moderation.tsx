import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star, Search, CheckCircle2, XCircle, Eye } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { formatDay } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews/moderation")({ component: ReviewModerationPage });

function ReviewModerationPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    adminFetch<any[]>("reviews")
      .then(d => { setReviews(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    reviews.filter(r => {
      const matchQ = !q || (r.comment ?? "").toLowerCase().includes(q.toLowerCase()) || (r.authorName ?? "").toLowerCase().includes(q.toLowerCase());
      const matchF = filter === "all" || (r.status ?? "pending") === filter;
      return matchQ && matchF;
    }), [reviews, q, filter]);

  async function moderate(id: string, action: "approve" | "reject") {
    try {
      await fetch(`${API_ORIGIN}/api/admin/reviews/${id}/${action}`, {
        method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r));
      toast.success(action === "approve" ? "Review approved" : "Review rejected");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Star className="size-7 text-amber-500" /> Review Moderation</h1>
        <p className="text-muted-foreground mt-1 text-sm">Approve or reject customer reviews before publishing.</p>
      </header>
      <div className="surface-card mb-4 rounded-3xl p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search reviews…" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="rounded-lg border border-border bg-background px-3 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {loading ? <div className="surface-card rounded-3xl py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          filtered.length === 0 ? <div className="surface-card rounded-3xl py-12 text-center text-muted-foreground text-sm">No reviews found.</div> :
          filtered.map(r => {
            const status = r.status ?? "pending";
            const tone = status === "approved" ? "bg-emerald-100 text-emerald-800" : status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800";
            return (
              <div key={r.id} className="surface-card rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{r.authorName ?? "Anonymous"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{status}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`size-3 ${i < (r.rating ?? 0) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.comment ?? "—"}</p>
                    <div className="mt-1 text-xs text-muted-foreground">{r.productName ?? r.productId ?? "—"} · {r.createdAt ? formatDay(r.createdAt) : "—"}</div>
                  </div>
                  {status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => moderate(r.id, "approve")} className="text-emerald-700 border-emerald-300"><CheckCircle2 className="size-3 mr-1" />Approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => moderate(r.id, "reject")} className="text-rose-700"><XCircle className="size-3 mr-1" />Reject</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </AdminLayout>
  );
}
