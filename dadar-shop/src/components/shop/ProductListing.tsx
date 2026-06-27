import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Search, SlidersHorizontal, ArrowUpDown, X, Tag, PackageSearch, Loader2,
} from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { FilterSheet } from "@/components/shop/FilterSheet";
import { SortSheet } from "@/components/shop/SortSheet";
import { Pagination } from "@/components/shop/Pagination";
import { Button } from "@/components/ui/button";
import { FloatingBottomNav } from "@/components/shop/FloatingBottomNav";
import {
  CATEGORIES, PRICE_BUCKETS, SORT_OPTIONS, PAGE_SIZE,
  type ListingFilters, type PriceBucketId, type SortId, type CatalogProduct,
} from "@/data/products";
import { cn } from "@/lib/utils";
import { API_ORIGIN } from "@/lib/accountApi";

interface ProductListingProps {
  categorySlug?: string;
  search: ListingFilters;
  /** Updates URL search params (partial merge). */
  updateSearch: (next: Partial<ListingFilters>) => void;
}

function usePriceBucketRange(priceId: PriceBucketId) {
  const bucket = PRICE_BUCKETS.find((b) => b.id === priceId) ?? PRICE_BUCKETS[0];
  return { min: bucket.min, max: bucket.max };
}

function useApiProducts(search: ListingFilters, categorySlug?: string) {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const { min: priceMin, max: priceMax } = usePriceBucketRange(search.price);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (search.q) params.set("q", search.q);
    params.set("category", categorySlug ?? search.category ?? "all");
    if (search.subcategory && search.subcategory !== "All") params.set("subcategory", search.subcategory);
    if (search.brands.length > 0) params.set("brands", search.brands.join(","));
    params.set("priceMin", String(priceMin));
    params.set("priceMax", String(priceMax));
    if (search.minRating > 0) params.set("minRating", String(search.minRating));
    params.set("sort", search.sort);
    params.set("page", String(search.page || 1));

    fetch(`${API_ORIGIN}/api/shop/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const apiItems = (Array.isArray(d.items) ? d.items : []).map((p: any) => ({
          id: p.id,
          name: p.name,
          image: "",           // API products don't carry image URL yet; ProductCard handles missing gracefully
          price: p.price,
          originalPrice: p.originalPrice ?? undefined,
          rating: p.rating,
          reviews: p.reviewCount,
          seller: p.sellerName ?? p.brandName,
          badge: p.badge ?? undefined,
          brand: p.brandName,
          category: p.categorySlug,
          subcategory: p.subcategory ?? "",
        })) as CatalogProduct[];
        setItems(apiItems);
        setTotal(typeof d.total === "number" ? d.total : apiItems.length);
      })
      .catch(() => {
        if (!cancelled) { setItems([]); setTotal(0); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q, search.category, search.subcategory, search.brands.join(","), search.price, search.minRating, search.sort, search.page, categorySlug]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return { items, total, loading, pageCount };
}

export function ProductListing({ categorySlug, search, updateSearch }: ProductListingProps) {
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const [searchText, setSearchText] = useState(search.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchText(search.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearchTextChange(value: string) {
    setSearchText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSearch({ q: value, page: 1 });
    }, 400);
  }

  function clearSearchText() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchText("");
    updateSearch({ q: "", page: 1 });
  }

  const activeCategory =
    categorySlug && CATEGORIES.find((c) => c.slug === categorySlug)
      ? CATEGORIES.find((c) => c.slug === categorySlug)!
      : null;

  const { items, total, loading, pageCount } = useApiProducts(search, categorySlug ?? undefined);

  const sortLabel = SORT_OPTIONS.find((o) => o.id === search.sort)?.label ?? "Sort";
  const priceLabel = PRICE_BUCKETS.find((b) => b.id === search.price)?.label;
  const activeFilterCount =
    search.brands.length +
    (search.price !== "any" ? 1 : 0) +
    (search.minRating > 0 ? 1 : 0);

  const heroTitle = activeCategory ? activeCategory.label : "All products";
  const subcategories = activeCategory?.subcategories ?? [];


  return (
    <div className="bg-background min-h-screen pb-32">
      <div className="mobile-shell">
        {/* Sticky top */}
        <header className="glass sticky top-0 z-40 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <button
              onClick={() => navigate({ to: "/" })}
              aria-label="Back"
              className="bg-surface/70 tap-scale tap-scale-active flex size-10 shrink-0 items-center justify-center rounded-pill border border-border"
            >
              <ArrowLeft className="size-5" strokeWidth={2.25} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Shop
              </p>
              <h1 className="text-display truncate text-[15px] font-semibold leading-tight">
                {heroTitle}
              </h1>
            </div>
            <span className="bg-primary-soft text-primary tabular-nums shrink-0 rounded-pill px-3 py-1.5 text-[11px] font-semibold">
              {total} items
            </span>
          </div>

          {/* Search */}
          <label className="bg-surface mt-3 flex h-11 items-center gap-2 rounded-pill border border-border px-4 shadow-soft">
            <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.25} />
            <input
              value={searchText}
              onChange={(e) => handleSearchTextChange(e.target.value)}
              placeholder="Search in this category…"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/70"
            />
            {searchText && (
              <button
                onClick={clearSearchText}
                className="text-muted-foreground tap-scale tap-scale-active"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </header>

        {/* Categories rail */}
        <nav
          aria-label="Categories"
          className="hide-scrollbar mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5"
        >
          <CategoryPill label="All" active={!activeCategory} />
          {CATEGORIES.map((c) => (
            <CategoryPill
              key={c.slug}
              categorySlug={c.slug}
              label={c.label}
              active={activeCategory?.slug === c.slug}
            />
          ))}

        </nav>

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <div className="hide-scrollbar mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5">
            {subcategories.map((s) => {
              const active = (search.subcategory || "All") === s;
              return (
                <button
                  key={s}
                  onClick={() => updateSearch({ subcategory: s, page: 1 })}
                  className={cn(
                    "tap-scale tap-scale-active h-8 shrink-0 snap-start rounded-pill border px-3 text-[12px] font-medium transition-all",
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-surface text-muted-foreground border-border",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}

        {/* Toolbar: sort + filter */}
        <div className="mt-4 flex items-center gap-2 px-5">
          <button
            onClick={() => setFilterOpen(true)}
            className="bg-surface tap-scale tap-scale-active relative flex h-11 flex-1 items-center justify-center gap-2 rounded-pill border border-border text-[13px] font-medium shadow-soft"
          >
            <SlidersHorizontal className="size-4" strokeWidth={2.2} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground absolute right-3 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setSortOpen(true)}
            className="bg-surface tap-scale tap-scale-active flex h-11 flex-1 items-center justify-center gap-2 rounded-pill border border-border text-[13px] font-medium shadow-soft"
          >
            <ArrowUpDown className="size-4" strokeWidth={2.2} />
            <span className="truncate">{sortLabel}</span>
          </button>
        </div>

        {/* Active chips */}
        {activeFilterCount > 0 && (
          <div className="hide-scrollbar mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5">
            {search.price !== "any" && (
              <ActiveChip
                label={priceLabel ?? ""}
                onRemove={() => updateSearch({ price: "any" as PriceBucketId, page: 1 })}
              />
            )}
            {search.minRating > 0 && (
              <ActiveChip
                label={`${search.minRating}+ stars`}
                onRemove={() => updateSearch({ minRating: 0, page: 1 })}
              />
            )}
            {search.brands.map((b) => (
              <ActiveChip
                key={b}
                label={b}
                onRemove={() =>
                  updateSearch({
                    brands: search.brands.filter((x) => x !== b),
                    page: 1,
                  })
                }
              />
            ))}
            <button
              onClick={() =>
                updateSearch({
                  brands: [],
                  price: "any" as PriceBucketId,
                  minRating: 0,
                  subcategory: "All",
                  page: 1,
                })
              }
              className="text-primary shrink-0 px-2 text-[12px] font-semibold underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Grid */}
        <section className="mt-5 px-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="text-primary size-7 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              onReset={() =>
                updateSearch({
                  q: "",
                  brands: [],
                  price: "any" as PriceBucketId,
                  minRating: 0,
                  subcategory: "All",
                  page: 1,
                })
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* Pagination */}
        {!loading && items.length > 0 && (
          <div className="mt-7 px-5">
            <Pagination
              page={search.page}
              pageCount={pageCount}
              onChange={(page) => {
                updateSearch({ page });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Showing {(search.page - 1) * PAGE_SIZE + 1}–
              {Math.min(search.page * PAGE_SIZE, total)} of {total}
            </p>
          </div>
        )}
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        brands={search.brands}
        price={search.price}
        minRating={search.minRating}
        totalCount={total}
        onApply={(next) => updateSearch({ ...next, page: 1 })}
      />

      <SortSheet
        open={sortOpen}
        value={search.sort}
        onClose={() => setSortOpen(false)}
        onChange={(sort: SortId) => updateSearch({ sort, page: 1 })}
      />

      <FloatingBottomNav />
    </div>
  );
}

function CategoryPill({
  categorySlug, label, active,
}: {
  /** undefined means "All" — links to /shop with no category filter */
  categorySlug?: string;
  label: string;
  active: boolean;
}) {
  const sharedClass = cn(
    "tap-bounce h-9 shrink-0 snap-start rounded-pill border px-4 text-[13px] font-medium leading-none flex items-center transition-all",
    active
      ? "bg-primary text-primary-foreground border-primary shadow-[0_6px_16px_-6px_color-mix(in_oklab,var(--color-primary)_60%,transparent)]"
      : "bg-surface text-foreground border-border",
  );

  if (!categorySlug) {
    return (
      <Link to="/shop" className={sharedClass}>
        {label}
      </Link>
    );
  }

  return (
    <Link to="/shop/$category" params={{ category: categorySlug }} className={sharedClass}>
      {label}
    </Link>
  );
}


function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="bg-primary-soft text-primary tap-scale flex shrink-0 snap-start items-center gap-1.5 rounded-pill py-1.5 pl-3 pr-1.5 text-[12px] font-medium">
      <Tag className="size-3" />
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="bg-primary text-primary-foreground tap-scale-active flex size-5 items-center justify-center rounded-full"
      >
        <X className="size-3" strokeWidth={3} />
      </button>
    </span>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center">
      <span className="bg-primary-soft text-primary flex size-14 items-center justify-center rounded-pill">
        <PackageSearch className="size-6" strokeWidth={2} />
      </span>
      <h3 className="text-display text-base font-semibold">No matching products</h3>
      <p className="max-w-[28ch] text-[13px] text-muted-foreground">
        Try removing a filter or searching for something else.
      </p>
      <Button variant="soft" size="default" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
