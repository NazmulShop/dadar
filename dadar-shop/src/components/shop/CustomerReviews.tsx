import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ORIGIN } from "@/lib/accountApi";

interface PublicReview {
  id: string;
  authorName?: string;
  rating: number;
  comment?: string;
  productName?: string;
  createdAt?: string;
}

const TONE_POOL = ["primary", "amber", "coral"] as const;
const toneBg = {
  primary: "bg-primary-soft text-primary",
  amber: "bg-amber/20 text-amber-foreground",
  coral: "bg-coral/15 text-coral",
} as const;

function initials(name?: string) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function CustomerReviews() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    fetch(`${API_ORIGIN}/api/shop/reviews?limit=6`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setReviews(d.filter((r: any) => r.rating >= 4));
        }
      })
      .catch(() => {});
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="hide-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5">
      {reviews.map((r, idx) => {
        const tone = TONE_POOL[idx % TONE_POOL.length];
        return (
          <article
            key={r.id}
            className="surface-card relative w-[280px] shrink-0 snap-start rounded-3xl p-5"
          >
            <Quote className="text-primary/15 absolute right-4 top-4 size-8" strokeWidth={1.5} />
            <div className="flex items-center gap-1 text-amber">
              {Array.from({ length: 5 }).map((_, i) => {
                const fillRatio = Math.max(0, Math.min(1, r.rating - i));
                return (
                  <span key={i} className="relative inline-block size-3.5">
                    <Star className="absolute inset-0 size-3.5 text-muted-foreground/30" strokeWidth={0} />
                    {fillRatio > 0 && (
                      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillRatio * 100}%` }}>
                        <Star className="size-3.5 fill-amber text-amber" strokeWidth={0} />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            <p className="text-foreground/85 mt-3 text-[13px] leading-relaxed">
              "{r.comment ?? "Great product!"}"
            </p>
            <div className="border-border mt-4 flex items-center gap-3 border-t pt-3">
              <div className={cn("flex size-9 items-center justify-center rounded-full text-[12px] font-semibold", toneBg[tone])}>
                {initials(r.authorName)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-tight">{r.authorName ?? "Anonymous"}</p>
                {r.productName && (
                  <p className="truncate text-[11px] text-muted-foreground">{r.productName}</p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
