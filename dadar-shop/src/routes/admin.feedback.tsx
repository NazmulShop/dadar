import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/feedback")({ component: FeedbackPage });

function FeedbackPage() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("feedback").then(d => { if (Array.isArray(d)) setFeedback(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const positive = feedback.filter(f => f.rating >= 4).length;
  const negative = feedback.filter(f => f.rating < 3).length;
  const avgRating = feedback.length ? (feedback.reduce((s, f) => s + (f.rating ?? 0), 0) / feedback.length).toFixed(1) : "—";

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><ThumbsUp className="size-7 text-emerald-600" /> Customer Feedback</h1>
        <p className="text-muted-foreground mt-1 text-sm">Customer satisfaction ratings and qualitative feedback.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Feedback</div><div className="text-display mt-1 text-2xl font-semibold">{feedback.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Avg Rating</div><div className="text-display mt-1 text-2xl font-semibold text-amber-600">★ {avgRating}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Positive</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{positive}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Negative</div><div className="text-display mt-1 text-2xl font-semibold text-rose-700">{negative}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : feedback.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No customer feedback yet.</p>
        ) : (
          <ul className="space-y-3">
            {feedback.map(f => (
              <li key={f.id} className="border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{f.customerName ?? "Anonymous"}</span>
                      <span className="text-amber-600 text-sm">{"★".repeat(f.rating ?? 0)}{"☆".repeat(5 - (f.rating ?? 0))}</span>
                    </div>
                    {f.comment && <p className="text-muted-foreground text-xs mt-1">{f.comment}</p>}
                    <p className="text-muted-foreground text-[10px] mt-1">{f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}</p>
                  </div>
                  {(f.rating ?? 0) >= 4 ? <ThumbsUp className="size-4 text-emerald-600 shrink-0" /> : <ThumbsDown className="size-4 text-rose-500 shrink-0" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
