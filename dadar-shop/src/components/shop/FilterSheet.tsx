import { useState } from "react";
import { X, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRANDS, PRICE_BUCKETS, type PriceBucketId } from "@/data/products";
import { cn } from "@/lib/utils";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  brands: string[];
  price: PriceBucketId;
  minRating: number;
  onApply: (next: { brands: string[]; price: PriceBucketId; minRating: number }) => void;
  totalCount: number;
}

export function FilterSheet({
  open, onClose, brands, price, minRating, onApply, totalCount,
}: FilterSheetProps) {
  const [b, setB] = useState<string[]>(brands);
  const [p, setP] = useState<PriceBucketId>(price);
  const [r, setR] = useState<number>(minRating);

  const toggleBrand = (name: string) =>
    setB((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));

  const reset = () => {
    setB([]);
    setP("any");
    setR(0);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className="bg-foreground/40 absolute inset-0 backdrop-blur-sm"
      />
      <div
        className={cn(
          "bg-background absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] shadow-float transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-display text-lg font-semibold">Filters</h3>
          <button
            onClick={onClose}
            className="bg-muted tap-scale tap-scale-active flex size-9 items-center justify-center rounded-pill"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="space-y-7 px-5 pb-32 pt-5">
          <Group title="Price">
            <div className="grid grid-cols-2 gap-2">
              {PRICE_BUCKETS.map((bucket) => (
                <Chip
                  key={bucket.id}
                  active={p === bucket.id}
                  onClick={() => setP(bucket.id)}
                >
                  {bucket.label}
                </Chip>
              ))}
            </div>
          </Group>

          <Group title="Rating">
            <div className="flex flex-wrap gap-2">
              {[0, 3, 3.5, 4, 4.5].map((v) => (
                <Chip key={v} active={r === v} onClick={() => setR(v)}>
                  {v === 0 ? (
                    "Any"
                  ) : (
                    <span className="flex items-center gap-1">
                      <Star className="fill-amber text-amber size-3" strokeWidth={0} />
                      {v}+
                    </span>
                  )}
                </Chip>
              ))}
            </div>
          </Group>

          <Group title="Brand">
            <ul className="space-y-1">
              {BRANDS.map((brand) => {
                const active = b.includes(brand);
                return (
                  <li key={brand}>
                    <button
                      onClick={() => toggleBrand(brand)}
                      className="tap-scale tap-scale-active flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-[14px] hover:bg-muted"
                    >
                      <span className="font-medium text-foreground">{brand}</span>
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-md border transition-all",
                          active
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border-strong",
                        )}
                      >
                        {active && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Group>
        </div>

        <div className="glass-strong fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <Button variant="outline" size="lg" onClick={reset} className="flex-1">
            Reset
          </Button>
          <Button
            variant="hero"
            size="lg"
            onClick={() => {
              onApply({ brands: b, price: p, minRating: r });
              onClose();
            }}
            className="flex-[1.4]"
          >
            Show {totalCount} results
          </Button>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chip({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tap-scale tap-scale-active flex h-10 items-center justify-center rounded-pill border px-3 text-[13px] font-medium transition-all",
        active
          ? "bg-primary border-primary text-primary-foreground"
          : "border-border bg-surface text-foreground hover:border-border-strong",
      )}
    >
      {children}
    </button>
  );
}
