import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StickyHeader } from "@/components/shop/StickyHeader";
import { FloatingBottomNav } from "@/components/shop/FloatingBottomNav";
import { useShopActions, useWishlistProducts } from "@/lib/shopStore";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Your Wishlist — Dadar Shop" },
      {
        name: "description",
        content: "Save products you love and move them to your bag whenever you're ready.",
      },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const items = useWishlistProducts();
  const { removeFromWishlist, moveWishlistToCart, addToCart } = useShopActions();

  return (
    <div className="bg-background min-h-screen pb-40">
      <StickyHeader />
      <div className="mx-auto w-full max-w-[720px] px-4 pt-2">
        <header className="mb-4">
          <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
            <Heart className="text-coral size-6" /> Wishlist
          </h1>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item saved" : "items saved"}
          </p>
        </header>

        {items.length === 0 ? (
          <div className="surface-card flex flex-col items-center rounded-3xl p-10 text-center">
            <div className="bg-coral/10 text-coral mb-4 flex size-16 items-center justify-center rounded-full">
              <Heart className="size-7" />
            </div>
            <h2 className="text-display text-lg font-semibold">No wishlisted items yet</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Tap the heart on any product to save it here for later.
            </p>
            <Button variant="hero" size="lg" className="mt-5" asChild>
              <Link to="/shop">Discover products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((p) => (
              <article
                key={p.id}
                className="surface-card flex flex-col overflow-hidden rounded-3xl"
              >
                <div className="bg-surface-muted relative aspect-square overflow-hidden">
                  <Link
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="absolute inset-0"
                  >
                    <img
                      src={p.image as string}
                      alt={p.name}
                      className="size-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                  </Link>
                  <button
                    onClick={() => removeFromWishlist(p.id)}
                    aria-label="Remove from wishlist"
                    className="glass-strong absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-pill"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <h3 className="line-clamp-2 text-[13px] font-medium leading-snug">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="text-display text-foreground text-[14px] font-semibold tabular-nums">
                      ৳{p.price.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="fill-amber text-amber size-3" strokeWidth={0} />{" "}
                      {p.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-auto flex gap-1.5 pt-2">
                    <Button
                      size="sm"
                      variant="hero"
                      className="flex-1"
                      onClick={() => moveWishlistToCart(p.id)}
                    >
                      <ShoppingBag className="size-3.5" /> Move
                    </Button>
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => addToCart(p.id, 1)}
                      aria-label="Add to cart"
                    >
                      <ShoppingBag className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <FloatingBottomNav />
    </div>
  );
}
