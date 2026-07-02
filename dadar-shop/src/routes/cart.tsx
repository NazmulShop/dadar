import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  X,
  Bookmark,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StickyHeader } from "@/components/shop/StickyHeader";
import { FloatingBottomNav } from "@/components/shop/FloatingBottomNav";
import {
  COUPONS,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_OPTIONS,
  useCartLines,
  useCartTotals,
  useSavedLines,
  useShopActions,
} from "@/lib/shopStore";
import type { CatalogProduct } from "@/data/products";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Dadar Shop" },
      {
        name: "description",
        content:
          "Review your bag, apply coupons, pick a delivery option and check out securely on Dadar Shop.",
      },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const lines = useCartLines();
  const saved = useSavedLines();
  const totals = useCartTotals();
  const {
    setQty,
    removeFromCart,
    moveCartToSaved,
    moveSavedToCart,
    removeSaved,
    moveCartToWishlist,
    setShipping,
    applyCoupon,
  } = useShopActions();

  const empty = lines.length === 0;

  return (
    <div className="bg-background min-h-screen pb-40">
      <StickyHeader />
      <div className="mx-auto w-full max-w-[720px] px-4 pt-2">
        <button
          onClick={() => navigate({ to: "/shop" })}
          className="tap-scale tap-scale-active mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Continue shopping
        </button>
        <header className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-display text-2xl font-semibold">Your bag</h1>
            <p className="text-xs text-muted-foreground">
              {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          {!empty && (
            <FreeShipMeter subtotal={totals.subtotal} />
          )}
        </header>

        {empty ? (
          <EmptyCart />
        ) : (
          <div className="space-y-3">
            {lines.map(({ line, product }) => (
              <CartLineRow
                key={line.id}
                product={product}
                qty={line.qty}
                onIncrement={() => setQty(product.id, line.qty + 1)}
                onDecrement={() => setQty(product.id, line.qty - 1)}
                onRemove={() => removeFromCart(product.id)}
                onSaveForLater={() => moveCartToSaved(product.id)}
                onWishlist={() => moveCartToWishlist(product.id)}
              />
            ))}
          </div>
        )}

        {!empty && (
          <>
            <ShippingPicker
              selected={totals.shippingOption.id}
              freeApplied={totals.shippingFreeApplied}
              onChange={setShipping}
            />
            <CouponBlock
              applied={totals.coupon?.code ?? null}
              error={totals.couponError}
              onApply={(c) => applyCoupon(c)}
              onClear={() => applyCoupon(null)}
            />
            <SummaryCard totals={totals} />
          </>
        )}

        {saved.length > 0 && (
          <section className="mt-8">
            <h2 className="text-display mb-3 flex items-center gap-2 text-lg font-semibold">
              <Bookmark className="size-4 text-muted-foreground" /> Saved for later
              <span className="text-xs font-normal text-muted-foreground">
                ({saved.length})
              </span>
            </h2>
            <div className="space-y-3">
              {saved.map(({ line, product }) => (
                <SavedRow
                  key={line.id}
                  product={product}
                  qty={line.qty}
                  onMove={() => moveSavedToCart(product.id)}
                  onRemove={() => removeSaved(product.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <FloatingBottomNav />
    </div>
  );
}

function FreeShipMeter({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  if (remaining === 0) {
    return (
      <div className="bg-primary-soft text-primary inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold">
        <Truck className="size-3" /> Free shipping
      </div>
    );
  }
  return (
    <div className="w-36 text-right">
      <p className="text-[11px] text-muted-foreground">
        ৳{remaining.toLocaleString()} to free ship
      </p>
      <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="surface-card flex flex-col items-center rounded-3xl p-10 text-center">
      <div className="bg-primary-soft text-primary mb-4 flex size-16 items-center justify-center rounded-full">
        <ShoppingBag className="size-7" />
      </div>
      <h2 className="text-display text-lg font-semibold">Your bag is empty</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Add a few favourites and they'll show up here, ready to check out.
      </p>
      <Button variant="hero" size="lg" className="mt-5" asChild>
        <Link to="/shop">Browse products</Link>
      </Button>
    </div>
  );
}

function CartLineRow({
  product,
  qty,
  onIncrement,
  onDecrement,
  onRemove,
  onSaveForLater,
  onWishlist,
}: {
  product: CatalogProduct;
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onSaveForLater: () => void;
  onWishlist: () => void;
}) {
  const lineTotal = product.price * qty;
  return (
    <article className="surface-card rounded-3xl p-3">
      <div className="flex gap-3">
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="bg-surface-muted size-24 shrink-0 overflow-hidden rounded-2xl"
        >
          <img
            src={product.image as string}
            alt={product.name}
            className="size-full object-cover"
            loading="lazy"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to="/product/$id"
                params={{ id: product.id }}
                className="line-clamp-2 text-sm font-medium leading-snug"
              >
                {product.name}
              </Link>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {product.brand} · {product.subcategory}
              </p>
            </div>
            <button
              onClick={onRemove}
              aria-label="Remove from cart"
              className="text-muted-foreground hover:text-coral -mr-1 -mt-1 p-1"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-display text-[15px] font-semibold tabular-nums">
                ৳{lineTotal.toLocaleString()}
              </div>
              {qty > 1 && (
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  ৳{product.price.toLocaleString()} each
                </div>
              )}
            </div>
            <QtyControl qty={qty} onInc={onIncrement} onDec={onDecrement} />
          </div>
        </div>
      </div>

      <div className="border-border mt-3 flex items-center gap-1 border-t pt-2 text-[12px]">
        <button
          onClick={onSaveForLater}
          className="tap-scale tap-scale-active flex flex-1 items-center justify-center gap-1.5 rounded-pill py-1.5 text-muted-foreground hover:text-foreground"
        >
          <Bookmark className="size-3.5" /> Save for later
        </button>
        <span className="bg-border h-4 w-px" />
        <button
          onClick={onWishlist}
          className="tap-scale tap-scale-active flex flex-1 items-center justify-center gap-1.5 rounded-pill py-1.5 text-muted-foreground hover:text-foreground"
        >
          <Heart className="size-3.5" /> Move to wishlist
        </button>
        <span className="bg-border h-4 w-px" />
        <button
          onClick={onRemove}
          className="tap-scale tap-scale-active text-coral flex flex-1 items-center justify-center gap-1.5 rounded-pill py-1.5"
        >
          <Trash2 className="size-3.5" /> Remove
        </button>
      </div>
    </article>
  );
}

function QtyControl({
  qty,
  onInc,
  onDec,
}: {
  qty: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="bg-surface flex items-center gap-1 rounded-pill border border-border p-1">
      <button
        type="button"
        onClick={onDec}
        aria-label="Decrease quantity"
        disabled={qty <= 1}
        className="tap-scale tap-scale-active flex size-7 items-center justify-center rounded-full text-foreground disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
      <button
        type="button"
        onClick={onInc}
        aria-label="Increase quantity"
        className="tap-scale tap-scale-active bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function SavedRow({
  product,
  qty,
  onMove,
  onRemove,
}: {
  product: CatalogProduct;
  qty: number;
  onMove: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="surface-card flex items-center gap-3 rounded-3xl p-3">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="bg-surface-muted size-16 shrink-0 overflow-hidden rounded-2xl"
      >
        <img src={product.image as string} alt={product.name} className="size-full object-cover" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
        <p className="text-[11px] text-muted-foreground">
          ৳{product.price.toLocaleString()} · Qty {qty}
        </p>
      </div>
      <Button variant="soft" size="sm" onClick={onMove}>
        Move to cart
      </Button>
      <button
        onClick={onRemove}
        aria-label="Remove"
        className="text-muted-foreground hover:text-coral p-1"
      >
        <X className="size-4" />
      </button>
    </article>
  );
}

function ShippingPicker({
  selected,
  freeApplied,
  onChange,
}: {
  selected: string;
  freeApplied: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <section className="surface-card mt-4 rounded-3xl p-4">
      <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
        <Truck className="size-4 text-muted-foreground" /> Delivery
      </h3>
      <div className="space-y-2">
        {SHIPPING_OPTIONS.map((opt) => {
          const active = selected === opt.id;
          const displayCost =
            freeApplied && opt.id === "standard"
              ? "Free"
              : opt.cost === 0
                ? "Free"
                : `৳${opt.cost}`;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "tap-scale tap-scale-active flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary-soft/40"
                  : "border-border bg-surface hover:bg-muted",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border-2",
                    active ? "border-primary bg-primary" : "border-border bg-surface",
                  )}
                >
                  {active && <Check className="text-primary-foreground size-3" strokeWidth={3} />}
                </span>
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-[11px] text-muted-foreground">{opt.eta}</div>
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums">{displayCost}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CouponBlock({
  applied,
  error,
  onApply,
  onClear,
}: {
  applied: string | null;
  error: string | null;
  onApply: (code: string) => void;
  onClear: () => void;
}) {
  const [code, setCode] = useState("");

  return (
    <section className="surface-card mt-4 rounded-3xl p-4">
      <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
        <Tag className="size-4 text-muted-foreground" /> Coupon
      </h3>

      {applied ? (
        <div className="bg-primary-soft text-primary flex items-center justify-between rounded-2xl px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Check className="size-4" /> {applied} applied
          </div>
          <button
            onClick={onClear}
            className="text-primary/80 text-xs font-medium underline-offset-2 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (c) {
              onApply(c);
              setCode("");
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className="bg-surface flex h-11 flex-1 rounded-pill border border-border px-4 text-sm uppercase tracking-wider outline-none focus-visible:border-primary"
          />
          <Button type="submit" variant="default" size="default" disabled={!code.trim()}>
            Apply
          </Button>
        </form>
      )}

      {error && <p className="text-coral mt-2 text-xs">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {COUPONS.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onApply(c.code)}
            className={cn(
              "tap-scale tap-scale-active rounded-pill border px-3 py-1.5 text-[11px] font-medium transition-colors",
              applied === c.code
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            <span className="font-semibold tracking-wider">{c.code}</span>
            <span className="text-muted-foreground ml-1.5">· {c.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SummaryCard({ totals }: { totals: ReturnType<typeof useCartTotals> }) {
  return (
    <section className="surface-card mt-4 rounded-3xl p-5">
      <h3 className="text-display text-base font-semibold">Order summary</h3>
      <dl className="mt-4 space-y-2.5 text-sm">
        <Row label="Subtotal" value={`৳${totals.subtotal.toLocaleString()}`} />
        <Row
          label={
            <span className="flex items-center gap-1.5">
              <Truck className="size-3.5 text-muted-foreground" /> Shipping
              <span className="text-[11px] text-muted-foreground">
                ({totals.shippingOption.label})
              </span>
            </span>
          }
          value={totals.shipping === 0 ? "Free" : `৳${totals.shipping}`}
        />
        {totals.discount > 0 && (
          <Row
            label={
              <span className="text-success flex items-center gap-1.5">
                <Tag className="size-3.5" /> {totals.coupon?.code}
              </span>
            }
            value={`−৳${totals.discount.toLocaleString()}`}
            tone="success"
          />
        )}
      </dl>
      <div className="border-border mt-4 flex items-end justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-display text-2xl font-semibold tabular-nums">
          ৳{totals.total.toLocaleString()}
        </span>
      </div>
      <Button variant="hero" size="xl" className="mt-5 w-full" asChild>
        <Link to="/checkout">Proceed to checkout</Link>
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5" /> Buyer protection on every order
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums font-medium",
          tone === "success" ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
