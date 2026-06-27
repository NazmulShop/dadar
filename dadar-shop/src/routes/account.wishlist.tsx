import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShopActions, useWishlistProducts } from "@/lib/shopStore";

export const Route = createFileRoute("/account/wishlist")({
  component: AccountWishlist,
});

function AccountWishlist() {
  const items = useWishlistProducts();
  const { removeFromWishlist, moveWishlistToCart } = useShopActions();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
          <Heart className="text-coral size-6" /> Wishlist
        </h1>
        <p className="text-muted-foreground text-xs">
          {items.length} {items.length === 1 ? "item saved" : "items saved"}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="surface-card rounded-3xl p-8 text-center">
          <p className="text-muted-foreground text-sm">No items in your wishlist yet.</p>
          <Button variant="hero" className="mt-4" asChild>
            <Link to="/shop">Browse products</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((p) => (
            <li
              key={p.id}
              className="surface-card flex flex-col overflow-hidden rounded-3xl"
            >
              <Link to="/product/$id" params={{ id: p.id }} className="block">
                <img
                  src={p.image}
                  alt={p.name}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </Link>
              <div className="space-y-2 p-3">
                <div className="line-clamp-2 text-xs font-medium">{p.name}</div>
                <div className="text-sm font-semibold">৳{p.price.toLocaleString()}</div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="hero"
                    className="flex-1"
                    onClick={() => moveWishlistToCart(p.id)}
                  >
                    <ShoppingBag className="size-3" /> Bag
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => removeFromWishlist(p.id)}
                    aria-label="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
