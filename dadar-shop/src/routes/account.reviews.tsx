import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/data/account";
import { useAuth } from "@/lib/authStore";
import { accountFetch } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/reviews")({
  head: () => ({
    meta: [
      { title: "Your reviews — Dadar Shop" },
      {
        name: "description",
        content: "All reviews you've posted with star ratings, verified-purchase badge and moderation status.",
      },
    ],
  }),
  component: ReviewsPage,
});

type ReviewStatus = "Pending" | "Published" | "Rejected" | "Reported";
type StatusFilter = "all" | ReviewStatus;

interface ApiReview {
  id: string;
  productId?: string;
  productName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  reports: number;
  at: string;
}

const STATUS_TONE: Record<ReviewStatus, string> = {
  Published: "bg-emerald-100 text-emerald-800",
  Pending: "bg-amber-100 text-amber-800",
  Rejected: "bg-rose-100 text-rose-800",
  Reported: "bg-rose-100 text-rose-800",
};

function ReviewsPage() {
  const { getToken } = useAuth();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [items, setItems] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ productId: "", productName: "", rating: 5, comment: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await accountFetch<{ reviews: ApiReview[] }>("/reviews", getToken());
      setItems(Array.isArray(data.reviews) ? data.reviews : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((r) => r.status === filter)),
    [items, filter],
  );

  const avg = useMemo(() => {
    if (items.length === 0) return 0;
    return items.reduce((s, r) => s + r.rating, 0) / items.length;
  }, [items]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!form.productId.trim() || !form.productName.trim() || !form.comment.trim()) {
      toast.error("Please fill in product, name, and your review");
      return;
    }
    setSubmitting(true);
    try {
      await accountFetch("/reviews", getToken(), {
        method: "POST",
        body: JSON.stringify({
          productId: form.productId.trim(),
          productName: form.productName.trim(),
          rating: form.rating,
          comment: form.comment.trim(),
        }),
      });
      toast.success("Review submitted — pending moderation");
      setForm({ productId: "", productName: "", rating: 5, comment: "" });
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit review");
    } finally {
      setSubmitting(false);
    }
  }

  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "Published", label: "Published" },
    { id: "Pending", label: "Pending review" },
    { id: "Rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-4">
      <header className="surface-card flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
            <Star className="fill-amber text-amber size-6" /> Your reviews
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {loading ? "Loading…" : (
              <>
                {items.length} posted · avg{" "}
                <span className="text-foreground font-semibold">{avg.toFixed(1)}</span>★
              </>
            )}
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setFormOpen((v) => !v)}>
          <Star className="size-3.5" /> {formOpen ? "Cancel" : "New review"}
        </Button>
      </header>

      {formOpen && (
        <form onSubmit={submitReview} className="surface-card grid gap-3 rounded-3xl p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Product ID</Label>
            <Input
              required
              placeholder="e.g. p_12"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Product name</Label>
            <Input
              required
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Rating</Label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm({ ...form, rating: i + 1 })}
                  aria-label={`${i + 1} star`}
                >
                  <Star
                    className={cn(
                      "size-6",
                      i < form.rating ? "fill-amber text-amber" : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Your review</Label>
            <Textarea
              required
              rows={3}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" variant="hero" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit review"}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="surface-card text-muted-foreground rounded-3xl p-6 text-center text-sm">
          Couldn't load your reviews.{" "}
          <button onClick={load} className="text-primary underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {!error && (
        <div className="surface-card flex flex-wrap gap-1.5 rounded-3xl p-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-2xl px-3 py-1.5 text-xs font-medium transition",
                filter === f.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-surface-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {!error && (
        <ul className="space-y-3">
          {!loading && visible.length === 0 && (
            <li className="surface-card rounded-3xl p-8 text-center">
              <Star className="text-muted-foreground mx-auto mb-2 size-8" />
              <p className="text-muted-foreground text-sm">No reviews in this filter.</p>
            </li>
          )}
          {visible.map((r) => (
            <li key={r.id} className="surface-card rounded-3xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.productName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-3.5",
                            i < r.rating ? "fill-amber text-amber" : "text-muted-foreground/40",
                          )}
                        />
                      ))}
                    </div>
                    {r.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <BadgeCheck className="size-3" /> Verified purchase
                      </span>
                    )}
                  </div>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[r.status])}>
                  {r.status}
                </span>
              </div>

              <p className="text-muted-foreground mt-2 text-sm">{r.comment}</p>

              <div className="text-muted-foreground mt-3 text-[11px]">Posted {formatDay(r.at)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
