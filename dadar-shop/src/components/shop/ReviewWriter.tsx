import { useState } from "react";
import {
  BadgeCheck,
  Camera,
  Film,
  Flag,
  Star,
  ThumbsUp,
  X,
} from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/authStore";
import { cn } from "@/lib/utils";

/* ============================================================
 * Dadar Shop — Review system
 * ------------------------------------------------------------
 * - Star ratings (1–5)
 * - Photo reviews (multi-upload, preview, remove)
 * - Video reviews (single upload, preview, remove)
 * - Verified-purchase badge (from mocked order history)
 * - Review moderation: new reviews go to "Pending" by default
 * - Like (toggle) and Report (with reason) per existing review
 * - Auth-gated: only signed-in users can submit / like / report
 * ============================================================ */

interface LocalReview {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  photos: string[];
  videos: string[];
  verifiedPurchase: boolean;
  status: "Pending" | "Published";
  at: string;
  likes: number;
  liked: boolean;
  reports: number;
  reported: boolean;
}

const LS_KEY = (pid: string) => `dadar.reviews.${pid}.v1`;

function loadLocal(pid: string): LocalReview[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY(pid)) ?? "[]");
  } catch {
    return [];
  }
}

function saveLocal(pid: string, reviews: LocalReview[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY(pid), JSON.stringify(reviews));
}

interface Props {
  productId: string;
  productName: string;
}

export function ReviewWriter({ productId, productName }: Props) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [reviews, setReviews] = useState<LocalReview[]>(() => loadLocal(productId));
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  const requireAuth = (): boolean => {
    if (isAuthenticated) return true;
    toast.error("Please sign in to write a review");
    router.navigate({
      to: "/auth/login",
      search: { redirect: `/product/${productId}` } as never,
    });
    return false;
  };

  const onPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requireAuth()) return;
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length);
    Promise.all(
      files.map(
        (f) =>
          new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = () => res(String(reader.result));
            reader.readAsDataURL(f);
          }),
      ),
    ).then((urls) => setPhotos((p) => [...p, ...urls].slice(0, 5)));
  };

  const onVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requireAuth()) return;
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setVideo(String(reader.result));
    reader.readAsDataURL(f);
  };

  const submit = () => {
    if (!requireAuth()) return;
    if (!rating) {
      toast.error("Pick a star rating first");
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      toast.error("Write at least a short comment (10+ chars)");
      return;
    }
    const newReview: LocalReview = {
      id: "r_" + Math.random().toString(36).slice(2, 10),
      authorName: user?.name ?? "Customer",
      rating,
      title: title.trim() || undefined as unknown as string,
      comment: comment.trim(),
      photos,
      videos: video ? [video] : [],
      verifiedPurchase: true, // demo: assume order match
      status: "Pending", // moderation queue
      at: new Date().toISOString(),
      likes: 0,
      liked: false,
      reports: 0,
      reported: false,
    };
    const next = [newReview, ...reviews];
    setReviews(next);
    saveLocal(productId, next);
    setRating(0);
    setTitle("");
    setComment("");
    setPhotos([]);
    setVideo(null);
    toast.success("Review submitted — pending moderation");
  };

  const toggleLike = (id: string) => {
    if (!requireAuth()) return;
    const next = reviews.map((r) =>
      r.id === id
        ? { ...r, liked: !r.liked, likes: r.likes + (r.liked ? -1 : 1) }
        : r,
    );
    setReviews(next);
    saveLocal(productId, next);
  };

  const report = (id: string) => {
    if (!requireAuth()) return;
    setReportReason("");
    setReportTargetId(id);
  };

  const confirmReport = () => {
    if (!reportTargetId || !reportReason.trim()) return;
    const id = reportTargetId;
    const next = reviews.map((r) =>
      r.id === id && !r.reported
        ? { ...r, reported: true, reports: r.reports + 1 }
        : r,
    );
    setReviews(next);
    saveLocal(productId, next);
    toast.success("Report submitted to moderators");
    setReportTargetId(null);
    setReportReason("");
  };

  return (
    <div className="mt-5">
      {/* Submit form */}
      <div className="surface-card rounded-3xl p-4">
        <h3 className="text-display text-base font-semibold">Write a review</h3>
        <p className="text-muted-foreground mt-0.5 text-[12px]">
          Share your honest experience with {productName}.
        </p>

        {!isAuthenticated && (
          <div className="bg-amber/10 mt-3 rounded-2xl p-3 text-[12px]">
            <strong>Sign in required</strong> — you need an account to submit a review,
            like, or report.
          </div>
        )}

        {/* stars */}
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const n = i + 1;
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => (isAuthenticated ? setRating(n) : requireAuth())}
                className="tap-scale tap-scale-active p-1"
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    active ? "fill-amber text-amber" : "text-muted-foreground/40",
                  )}
                  strokeWidth={0}
                />
              </button>
            );
          })}
          <span className="text-muted-foreground ml-2 text-[12px]">
            {rating ? `${rating}/5` : "Pick a rating"}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            disabled={!isAuthenticated}
          />
          <Textarea
            placeholder="What did you like or dislike? Quality, fit, packaging, delivery…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1200}
            disabled={!isAuthenticated}
          />
        </div>

        {/* media */}
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="tap-scale tap-scale-active bg-surface-muted text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-[12px] font-medium">
            <Camera className="size-3.5" /> Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPhotos}
              disabled={!isAuthenticated || photos.length >= 5}
            />
          </label>
          <label className="tap-scale tap-scale-active bg-surface-muted text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-[12px] font-medium">
            <Film className="size-3.5" /> Add a video
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={onVideo}
              disabled={!isAuthenticated || !!video}
            />
          </label>
        </div>

        {(photos.length > 0 || video) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img
                  src={p}
                  alt={`Review photo ${i + 1}`}
                  className="size-16 rounded-xl border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPhotos((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  className="bg-background absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-border"
                  aria-label="Remove photo"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {video && (
              <div className="relative">
                <video
                  src={video}
                  className="size-16 rounded-xl border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setVideo(null)}
                  className="bg-background absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-border"
                  aria-label="Remove video"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <Button onClick={submit} variant="hero" className="mt-4 w-full">
          Submit review
        </Button>
      </div>

      {/* My / local reviews */}
      {reviews.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-display text-sm font-semibold">
            Recent reviews from this device
          </h4>
          {reviews.map((r) => (
            <article key={r.id} className="surface-card rounded-2xl p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold">{r.authorName}</p>
                    {r.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <BadgeCheck className="size-3" /> Verified
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        r.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-3",
                          i < r.rating ? "fill-amber text-amber" : "text-muted-foreground/30",
                        )}
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                </div>
                <time className="text-muted-foreground text-[11px]">
                  {new Date(r.at).toLocaleDateString()}
                </time>
              </div>
              {r.title && (
                <p className="mt-2 text-[13px] font-semibold">{r.title}</p>
              )}
              <p className="text-foreground/85 mt-1 text-[13px] leading-relaxed">
                {r.comment}
              </p>
              {(r.photos.length > 0 || r.videos.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.photos.map((p, i) => (
                    <img
                      key={i}
                      src={p}
                      alt={`${r.authorName}'s review photo ${i + 1}`}
                      className="size-14 rounded-lg border border-border object-cover"
                    />
                  ))}
                  {r.videos.map((v, i) => (
                    <video
                      key={i}
                      src={v}
                      controls
                      className="h-14 rounded-lg border border-border"
                    />
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-3 text-[12px]">
                <button
                  onClick={() => toggleLike(r.id)}
                  className={cn(
                    "tap-scale-active inline-flex items-center gap-1 rounded-full px-2 py-1",
                    r.liked
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-surface-muted",
                  )}
                >
                  <ThumbsUp className="size-3.5" /> {r.likes} Helpful
                </button>
                <button
                  onClick={() => report(r.id)}
                  className={cn(
                    "tap-scale-active inline-flex items-center gap-1 rounded-full px-2 py-1",
                    r.reported
                      ? "text-rose-600"
                      : "text-muted-foreground hover:bg-surface-muted",
                  )}
                >
                  <Flag className="size-3.5" /> {r.reported ? "Reported" : "Report"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={reportTargetId !== null} onOpenChange={(open) => !open && setReportTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this review</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Why are you reporting this review?</Label>
            <Textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. spam, offensive language, fake review…"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTargetId(null)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={confirmReport} disabled={!reportReason.trim()}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
