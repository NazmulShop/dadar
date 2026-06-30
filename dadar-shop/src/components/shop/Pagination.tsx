import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = pageWindow(page, pageCount);
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1.5"
    >
      <NavBtn
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        ariaLabel="Previous page"
      >
        <ChevronLeft className="size-4" strokeWidth={2.4} />
      </NavBtn>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="text-muted-foreground px-1 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "tap-scale tap-scale-active flex size-10 items-center justify-center rounded-pill text-[13px] font-semibold tabular-nums transition-all",
              p === page
                ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_color-mix(in_oklab,var(--color-primary)_60%,transparent)]"
                : "bg-surface text-foreground border border-border hover:border-border-strong",
            )}
          >
            {p}
          </button>
        ),
      )}
      <NavBtn
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        ariaLabel="Next page"
      >
        <ChevronRight className="size-4" strokeWidth={2.4} />
      </NavBtn>
    </nav>
  );
}

function NavBtn({
  onClick, disabled, ariaLabel, children,
}: {
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="bg-surface tap-scale tap-scale-active flex size-10 items-center justify-center rounded-pill border border-border text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function pageWindow(page: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, page - 1, page, page + 1]);
  const arr = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    const gap = i < arr.length - 1 ? arr[i + 1] - arr[i] : 0;
    if (gap === 2) {
      // Exactly one page is skipped — show it instead of a wasteful ellipsis.
      out.push(arr[i] + 1);
    } else if (gap > 2) {
      out.push("…");
    }
  }
  return out;
}
