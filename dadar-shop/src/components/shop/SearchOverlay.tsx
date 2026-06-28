import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpLeft,
  Clock,
  Flame,
  Mic,
  MicOff,
  Search as SearchIcon,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BRANDS,
  CATEGORIES,
  PRICE_BUCKETS,
  type CatalogProduct,
  type PriceBucketId,
} from "@/data/products";
import { useRecentSearches } from "@/lib/recentSearches";
import { useVoiceSearch } from "@/lib/useVoiceSearch";
import { API_ORIGIN } from "@/lib/accountApi";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const POPULAR = ["Sneakers", "Silk Saree", "Headphones", "Tote Bag", "Smartwatch", "Skincare"];
const TRENDING = [
  { term: "Wedding Sarees", delta: "+312%" },
  { term: "Wireless Headphones", delta: "+184%" },
  { term: "Cashmere Knits", delta: "+97%" },
  { term: "Field Watch", delta: "+64%" },
  { term: "Tortoise Sunglasses", delta: "+41%" },
];

/** Synonyms / Banglish → English keyword expansion */
const SYNONYMS: Record<string, string[]> = {
  saree: ["sharee", "shari", "sari", "shari"],
  sharee: ["saree", "sari", "shari"],
  watch: ["ghori", "ghori", "smartwatch", "timepiece"],
  ghori: ["watch", "smartwatch"],
  headphone: ["earphone", "headset", "cans"],
  headphones: ["earphones", "headset"],
  sneaker: ["shoe", "shoes", "trainer", "runner"],
  shoe: ["sneaker", "trainer"],
  bag: ["tote", "backpack", "crossbody", "purse"],
  sunglass: ["sunglasses", "shades", "eyewear", "frames"],
  sunglasses: ["shades", "eyewear", "frames"],
  beauty: ["skincare", "serum", "fragrance"],
  skincare: ["serum", "cream", "beauty"],
  wedding: ["bridal", "groom", "marriage", "biye"],
  biye: ["wedding", "bridal"],
  sweater: ["knit", "knitwear", "cardigan"],
};


function expandTokens(raw: string): string[] {
  const base = raw.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const expanded = new Set<string>(base);
  for (const t of base) {
    const syn = SYNONYMS[t];
    if (syn) syn.forEach((s) => expanded.add(s));
  }
  return Array.from(expanded);
}

function useApiSearch(query: string, categoryFilter: string) {
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ q: query, sort: "popular", page: "1" });
    if (categoryFilter !== "all") params.set("category", categoryFilter);

    fetch(`${API_ORIGIN}/api/shop/products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setResults((d.items ?? []).slice(0, 8).map((p: any) => ({
            id: p.id,
            name: p.name,
            image: "",
            price: p.price,
            originalPrice: p.originalPrice ?? undefined,
            rating: p.rating ?? 0,
            reviews: p.reviewCount ?? 0,
            seller: p.sellerName ?? p.brandName,
            badge: p.badge ?? undefined,
            brand: p.brandName,
            category: p.categorySlug,
            subcategory: p.subcategory ?? "",
          })));
        }
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [query, categoryFilter]);

  return { results, loading };
}

/**
 * Multi-token scoring for local typo-tolerant fallback (used only when
 * API returns no results). This no longer scans a static product list;
 * it's kept only for scoring API results if needed in the future.
 */
function scoreProduct(idx: SearchIndex, queryTokens: string[], rawQuery: string, categoryFilter: string) {
  if (categoryFilter !== "all" && idx.p.category !== categoryFilter) return -1;

  let total = 0;
  for (const qt of queryTokens) {
    // skip synonym tokens that aren't user-typed when they don't match
    const inHay = idx.haystack.indexOf(qt);
    if (inHay === -1) {
      // if this token came from base typed input, it's a hard requirement
      if (rawQuery.toLowerCase().includes(qt)) return -1;
      continue;
    }
    let s = 50 - Math.min(inHay, 50); // earlier match → higher
    if (idx.nameLower.includes(qt)) s += 80;
    if (idx.nameLower.startsWith(qt)) s += 120;
    if (idx.nameTokens.includes(qt)) s += 60;
    if (idx.tokens.includes(qt)) s += 30;
    total += s;
  }
  // category exact equal to query token
  if (queryTokens.some((t) => t === idx.p.category)) total += 90;
  total += idx.p.rating * 8;
  return total;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [price, setPrice] = useState<PriceBucketId>("any");
  const [brand, setBrand] = useState<string>("");
  const [minRating, setMinRating] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { recent, add, remove, clear } = useRecentSearches();

  // API-based search
  const { results, loading: searchLoading } = useApiSearch(query, category);
  const grouped = results.reduce<{ category: string; label: string; items: CatalogProduct[] }[]>(
    (acc, p) => {
      const existing = acc.find((g) => g.category === p.category);
      if (existing) { existing.items.push(p); }
      else { acc.push({ category: p.category, label: CATEGORIES.find((c) => c.slug === p.category)?.label ?? p.category, items: [p] }); }
      return acc;
    },
    []
  );

  const { supported, listening, transcript, error, start, stop } = useVoiceSearch((text) => {
    if (!text) return;
    setQuery(text);
    submit(text);
  });

  useEffect(() => {
    if (!open) {
      setQuery("");
      stop();
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, stop]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const debounced = query.trim().toLowerCase();

  // Simple keyword suggestions from results
  const suggestions = results.slice(0, 5).map((p) => p.name);

  function submit(term: string) {
    const t = term.trim();
    if (!t) return;
    add(t);
    navigate({
      to: "/shop",
      search: {
        q: t,
        category,
        subcategory: "All",
        brands: brand ? [brand] : [],
        price,
        minRating,
        sort: "popular",
        page: 1,
      } as never,
    });
    onClose();
  }

  if (!open) return null;

  const showLanding = !debounced;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Header */}
      <div className="glass sticky top-0 z-10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            aria-label="Close search"
            className="tap-scale tap-scale-active flex size-10 shrink-0 items-center justify-center rounded-pill border border-border bg-surface/70"
          >
            <X className="size-5" strokeWidth={2.25} />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(query);
            }}
            className="glass-strong flex h-12 flex-1 items-center gap-2 rounded-pill px-4 shadow-card"
          >
            <SearchIcon className="size-4 text-muted-foreground" strokeWidth={2.25} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              enterKeyHint="search"
              placeholder="Search products, brands, categories"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/80"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear"
                className="text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={listening ? stop : start}
              aria-label={listening ? "Stop voice search" : "Start voice search"}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                listening
                  ? "bg-coral text-coral-foreground animate-pulse"
                  : "bg-primary-soft text-primary",
                !supported && "opacity-60",
              )}
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
          </form>
        </div>

        {/* Quick filter chips */}
        <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5">
            <FilterChip
              label="All"
              active={category === "all"}
              onClick={() => setCategory("all")}
            />
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c.slug}
                label={c.label}
                active={category === c.slug}
                onClick={() => setCategory(c.slug)}
              />
            ))}
          </div>
        </div>

        {/* Voice status */}
        {(listening || transcript || error) && (
          <div className="mt-2 flex items-center gap-2 rounded-pill bg-surface-muted px-3 py-1.5 text-xs">
            <span className="bg-coral inline-block size-2 animate-pulse rounded-full" />
            <span className="text-muted-foreground">
              {error
                ? error
                : listening
                  ? transcript || "Listening… say a product or brand"
                  : transcript}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-[env(safe-area-inset-bottom)] pt-4">
        {showLanding ? (
          <LandingPanels
            recent={recent}
            onPick={(t) => {
              setQuery(t);
              submit(t);
            }}
            onRemove={remove}
            onClear={clear}
          />
        ) : (
          <ResultsPanel
            query={debounced}
            suggestions={suggestions}
            grouped={grouped}
            totalCount={results.length}
            onPickSuggestion={(t) => {
              setQuery(t);
              submit(t);
            }}
            onPickProduct={(p) => {
              add(p.name);
              onClose();
            }}
          />
        )}

        {/* Advanced filters quick row */}
        <details className="mt-6 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
            <span>Search filters</span>
            <span className="text-xs text-muted-foreground">
              {[
                price !== "any" && PRICE_BUCKETS.find((b) => b.id === price)?.label,
                brand,
                minRating > 0 && `${minRating}+ stars`,
              ]
                .filter(Boolean)
                .join(" · ") || "Refine"}
            </span>
          </summary>
          <div className="mt-3 space-y-3">
            <FilterRow label="Price">
              {PRICE_BUCKETS.map((b) => (
                <FilterChip
                  key={b.id}
                  label={b.label}
                  active={price === b.id}
                  onClick={() => setPrice(b.id)}
                />
              ))}
            </FilterRow>
            <FilterRow label="Brand">
              <FilterChip label="Any" active={!brand} onClick={() => setBrand("")} />
              {BRANDS.map((b) => (
                <FilterChip
                  key={b}
                  label={b}
                  active={brand === b}
                  onClick={() => setBrand(b)}
                />
              ))}
            </FilterRow>
            <FilterRow label="Rating">
              {[0, 3, 4, 4.5].map((r) => (
                <FilterChip
                  key={r}
                  label={r === 0 ? "Any" : `${r}+ ★`}
                  active={minRating === r}
                  onClick={() => setMinRating(r)}
                />
              ))}
            </FilterRow>
            <Button
              variant="hero"
              size="default"
              className="w-full"
              onClick={() => submit(query || "")}
              disabled={!query.trim() && !brand && price === "any" && minRating === 0}
            >
              Apply filters
            </Button>
          </div>
        </details>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tap-scale tap-scale-active shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function LandingPanels({
  recent,
  onPick,
  onRemove,
  onClear,
}: {
  recent: string[];
  onPick: (t: string) => void;
  onRemove: (t: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-6">
      {recent.length > 0 && (
        <section>
          <header className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="size-4 text-muted-foreground" />
              Recent searches
            </h3>
            <button
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </header>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {recent.map((t) => (
              <li key={t} className="flex items-center">
                <button
                  onClick={() => onPick(t)}
                  className="flex flex-1 items-center gap-3 px-4 py-3 text-left text-sm"
                >
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="flex-1">{t}</span>
                  <ArrowUpLeft className="size-4 text-muted-foreground" />
                </button>
                <button
                  aria-label={`Remove ${t}`}
                  onClick={() => onRemove(t)}
                  className="px-3 py-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Flame className="size-4 text-coral" />
          Popular searches
        </h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map((t) => (
            <button
              key={t}
              onClick={() => onPick(t)}
              className="tap-scale tap-scale-active rounded-pill border border-border bg-surface px-3.5 py-2 text-sm shadow-soft hover:bg-muted"
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <TrendingUp className="size-4 text-primary" />
          Trending now
        </h3>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {TRENDING.map((t, i) => (
            <li key={t.term}>
              <button
                onClick={() => onPick(t.term)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="text-primary w-5 text-sm font-bold tabular-nums">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm">{t.term}</span>
                <span className="bg-primary-soft text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {t.delta}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ResultsPanel({
  query,
  suggestions,
  grouped,
  totalCount,
  onPickSuggestion,
  onPickProduct,
}: {
  query: string;
  suggestions: string[];
  grouped: { category: string; label: string; items: CatalogProduct[] }[];
  totalCount: number;
  onPickSuggestion: (t: string) => void;
  onPickProduct: (p: CatalogProduct) => void;
}) {
  if (totalCount === 0 && suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
        <SearchIcon className="mx-auto mb-3 size-6 text-muted-foreground" />
        <p className="text-sm font-medium">No matches for "{query}"</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try a different keyword or browse popular searches.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {suggestions.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Suggestions
          </h3>
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  onClick={() => onPickSuggestion(s)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted"
                >
                  <SearchIcon className="size-4 text-muted-foreground" />
                  <span className="flex-1">
                    <Highlight text={s} query={query} />
                  </span>
                  <ArrowUpLeft className="size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grouped.map((group) => (
        <section key={group.category}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {group.items.length} {group.items.length === 1 ? "result" : "results"}
            </span>
          </div>
          <ul className="space-y-2">
            {group.items.map((p) => (
              <li key={p.id}>
                <Link
                  to="/product/$id"
                  params={{ id: p.id }}
                  onClick={() => onPickProduct(p)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 shadow-soft transition-colors hover:bg-muted"
                >
                  <img
                    src={p.image as string}
                    alt={p.name}
                    className="size-16 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      <Highlight text={p.name} query={query} />
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {p.brand} · {p.subcategory}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="font-semibold">৳{p.price.toLocaleString()}</span>
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <Star className="size-3 fill-amber text-amber" /> {p.rating}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber/40 rounded-sm px-0.5 text-foreground">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
