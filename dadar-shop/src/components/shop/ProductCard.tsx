import { Heart, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useIsWishlisted, useShopActions } from "@/lib/shopStore";

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  seller?: string;
}

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const liked = useIsWishlisted(product.id);
  const { toggleWishlist } = useShopActions();
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div
      className={cn(
        "group surface-card tap-scale tap-scale-active relative flex flex-col overflow-hidden rounded-3xl",
        className,
      )}
    >
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="absolute inset-0 z-0"
        aria-label={product.name}
      />

      <div className="bg-surface-muted relative aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {discount && (
          <span className="bg-coral text-coral-foreground absolute left-2.5 top-2.5 rounded-pill px-2 py-0.5 text-[11px] font-semibold tabular-nums">
            -{discount}%
          </span>
        )}
        {product.badge && (
          <span className="glass-strong absolute right-2.5 top-2.5 rounded-pill px-2 py-0.5 text-[11px] font-medium">
            {product.badge}
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={liked}
          className="glass-strong tap-scale tap-scale-active absolute bottom-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-pill"
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              liked ? "fill-coral text-coral" : "text-foreground",
            )}
            strokeWidth={2.25}
          />
        </button>
      </div>

      <div className="pointer-events-none flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
          {product.name}
        </h3>
        {product.seller && (
          <p className="text-[11px] text-muted-foreground">{product.seller}</p>
        )}
        <div className="mt-auto flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-display text-[15px] font-semibold tabular-nums text-foreground">
              ৳{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                ৳{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          <div className="bg-muted text-foreground/80 flex items-center gap-1 rounded-pill px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
            <Star className="fill-amber text-amber size-3" strokeWidth={0} />
            {product.rating.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}