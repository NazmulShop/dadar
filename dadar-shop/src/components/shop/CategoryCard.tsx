import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  label: string;
  icon: LucideIcon;
  count?: number;
  tone?: "default" | "primary" | "amber" | "coral";
  /** Category slug, e.g. "electronics" — routes to /shop/$category. */
  categorySlug?: string;
  /** Optional subcategory filter applied via the ?subcategory= search param. */
  subcategory?: string;
  className?: string;
}

const tones = {
  default: "bg-surface text-foreground",
  primary: "bg-primary-soft text-primary",
  amber: "bg-amber/15 text-amber-foreground",
  coral: "bg-coral/12 text-coral",
} as const;

export function CategoryCard({
  label,
  icon: Icon,
  count,
  tone = "default",
  categorySlug,
  subcategory,
  className,
}: CategoryCardProps) {
  const inner = (
    <>
      <div
        className={cn(
          "flex size-[60px] items-center justify-center rounded-2xl border border-border shadow-soft transition-all group-hover:shadow-card",
          tones[tone],
        )}
      >
        <Icon className="size-6" strokeWidth={1.8} />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[12px] font-medium leading-tight text-foreground">{label}</span>
        {count !== undefined && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{count}+</span>
        )}
      </div>
    </>
  );

  const sharedClass = cn(
    "tap-bounce group flex flex-col items-center gap-2",
    className,
  );

  if (categorySlug) {
    return (
      <Link
        to="/shop/$category"
        params={{ category: categorySlug }}
        search={subcategory ? { subcategory } as never : undefined}
        className={sharedClass}
      >
        {inner}
      </Link>
    );
  }
  return (
    <Link to="/shop" className={sharedClass}>
      {inner}
    </Link>
  );
}
