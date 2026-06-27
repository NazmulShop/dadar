import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Heart, Share2, Star, ShieldCheck, Truck, RotateCcw,
  Minus, Plus, ShoppingBag, Zap, Play, ChevronRight, Check, MessageCircle,
  Loader2,
} from "lucide-react";

import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsWishlisted, useShopActions, cacheProduct } from "@/lib/shopStore";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";
import { ReviewWriter } from "@/components/shop/ReviewWriter";
import { API_ORIGIN } from "@/lib/accountApi";

import productWatch from "@/assets/product-watch.jpg";
import productBag from "@/assets/product-bag.jpg";
import productHeadphones from "@/assets/product-headphones.jpg";
import productSneaker from "@/assets/product-sneaker.jpg";

const fallbackGallery = [productWatch, productBag, productHeadphones, productSneaker];

// DB product shape from API
interface ApiProduct {
  id: string;
  name: string;
  categorySlug: string;
  subcategory?: string;
  brandName: string;
  sellerName?: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  description?: string;
  status: string;
}

interface ApiReview {
  id: string;
  authorName?: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt?: string;
  status: string;
}

function useProduct(id: string) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [related, setRelated] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    fetch(`${API_ORIGIN}/api/shop/products/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 404) { if (!cancelled) setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (cancelled || !d) return;
        setProduct(d.product);
        setReviews(Array.isArray(d.reviews) ? d.reviews : []);
        // Cache product for cart/wishlist price lookups
        cacheProduct({
          id: d.product.id,
          name: d.product.name,
          image: fallbackGallery[0],
          price: d.product.price,
          originalPrice: d.product.originalPrice,
          rating: d.product.rating,
          reviews: d.product.reviewCount,
          seller: d.product.sellerName ?? d.product.brandName,
          badge: d.product.badge,
          brand: d.product.brandName,
          category: d.product.categorySlug,
          subcategory: d.product.subcategory ?? "",
        });
        // Fetch related products from same category
        if (d.product?.categorySlug) {
          return fetch(`${API_ORIGIN}/api/shop/products?category=${d.product.categorySlug}&page=1`)
            .then((r) => r.json())
            .then((rel) => {
              if (!cancelled) {
                setRelated(
                  (Array.isArray(rel.items) ? rel.items : []).filter((p: ApiProduct) => p.id !== id).slice(0, 4)
                );
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  return { product, reviews, related, loading, notFound };
}

export const Route = createFileRoute("/product/$id")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { product, reviews, related, loading, notFound } = useProduct(id);

  const gallery = useMemo(() => {
    return fallbackGallery.slice(0, 4);
  }, []);

  const [activeImg, setActiveImg] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [videoOpen, setVideoOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const liked = useIsWishlisted(id);
  const { addToCart, toggleWishlist } = useShopActions();
  const { isAuthenticated } = useAuth();
  const [variant, setVariant] = useState("M");
  const [color, setColor] = useState(0);
  const [tab, setTab] = useState<"specs" | "reviews">("specs");

  const requireSignIn = (next: string): boolean => {
    if (isAuthenticated) return true;
    toast.error("Please sign in to continue");
    router.navigate({ to: "/auth/login", search: { redirect: next } as never });
    return false;
  };

  const handleAddToCart = () => {
    if (!requireSignIn(`/product/${id}`)) return;
    addToCart(id, qty);
    toast.success("Added to your cart");
  };

  const handleBuyNow = () => {
    if (!requireSignIn(`/product/${id}`)) return;
    addToCart(id, qty);
    router.navigate({ to: "/cart" });
  };

  const handleToggleWishlist = () => {
    if (!requireSignIn(`/product/${id}`)) return;
    toggleWishlist(id);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard?.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-5 text-center">
        <div>
          <h1 className="text-display text-2xl font-semibold">Product not found</h1>
          <Link to="/shop" className="text-primary mt-3 inline-block text-sm underline">
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const colors = ["#1d3a2e", "#caa472", "#d97757", "#1a1a1a"];
  const sizes = ["S", "M", "L", "XL"];

  const specs = [
    { k: "Brand", v: product.brandName },
    { k: "Category", v: product.categorySlug },
    { k: "Subcategory", v: product.subcategory ?? "—" },
    { k: "Material", v: "Premium grade, ethically sourced" },
    { k: "Origin", v: "Made in Bangladesh" },
    { k: "Warranty", v: "1 year manufacturer warranty" },
    { k: "Delivery", v: "Free across Dhaka · 1–3 days" },
  ];

  // Related products as CatalogProduct-compatible
  const relatedAsCards = related.map((p) => ({
    id: p.id,
    name: p.name,
    image: fallbackGallery[0],
    price: p.price,
    originalPrice: p.originalPrice,
    rating: p.rating,
    reviews: p.reviewCount,
    seller: p.sellerName ?? p.brandName,
    badge: p.badge,
    brand: p.brandName,
    category: p.categorySlug,
    subcategory: p.subcategory ?? "",
  }));

  return (
    <div className="bg-background min-h-screen pb-32">
      <div className="mobile-shell">
        {/* Floating top bar */}
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center">
          <div className="mobile-shell pointer-events-auto flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              aria-label="Back"
              onClick={() => router.history.back()}
              className="glass-strong tap-scale tap-scale-active flex size-10 items-center justify-center rounded-pill"
            >
              <ArrowLeft className="size-5" strokeWidth={2.25} />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                aria-label="Share"
                onClick={handleShare}
                className="glass-strong tap-scale tap-scale-active flex size-10 items-center justify-center rounded-pill"
              >
                <Share2 className="size-[18px]" strokeWidth={2.25} />
              </button>
              <button
                aria-label="Wishlist"
                onClick={handleToggleWishlist}
                className="glass-strong tap-scale tap-scale-active flex size-10 items-center justify-center rounded-pill"
              >
                <Heart
                  className={cn("size-[18px] transition-colors", liked ? "fill-coral text-coral" : "text-foreground")}
                  strokeWidth={2.25}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <section className="bg-surface-muted relative">
          <div
            className="relative aspect-square w-full overflow-hidden"
            onMouseMove={(e) => {
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              setZoomPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
            onClick={() => setZoomed((v) => !v)}
          >
            <img
              src={gallery[activeImg]}
              alt={product.name}
              className={cn("size-full object-cover transition-transform duration-300", zoomed ? "scale-[2]" : "scale-100")}
              style={zoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
            />
            {discount && (
              <span className="bg-coral text-coral-foreground absolute left-4 top-20 rounded-pill px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                -{discount}% OFF
              </span>
            )}
            <button
              aria-label="Play product video"
              onClick={(e) => { e.stopPropagation(); setVideoOpen(true); }}
              className="glass-strong tap-scale tap-scale-active absolute bottom-4 left-4 flex items-center gap-2 rounded-pill px-3 py-2 text-[12px] font-medium"
            >
              <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full">
                <Play className="size-3 fill-current" strokeWidth={0} />
              </span>
              Watch
            </button>
            <div className="glass-strong absolute bottom-4 right-4 rounded-pill px-2.5 py-1 text-[11px] font-medium tabular-nums">
              {activeImg + 1} / {gallery.length}
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto px-5 pb-4 pt-3 hide-scrollbar">
            {gallery.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={cn(
                  "tap-scale tap-scale-active relative size-16 shrink-0 overflow-hidden rounded-2xl border-2 transition-colors",
                  i === activeImg ? "border-primary" : "border-border",
                )}
              >
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            ))}
            <button
              onClick={() => setVideoOpen(true)}
              className="tap-scale tap-scale-active bg-foreground/85 relative flex size-16 shrink-0 items-center justify-center rounded-2xl text-background"
            >
              <Play className="size-5 fill-current" strokeWidth={0} />
            </button>
          </div>
        </section>

        {/* Title block */}
        <section className="px-5 pt-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary-soft text-primary rounded-pill px-2 py-0.5 text-[11px] font-medium">
              {product.brandName}
            </span>
            {product.badge && (
              <span className="bg-amber/20 text-amber-foreground rounded-pill px-2 py-0.5 text-[11px] font-medium">
                {product.badge}
              </span>
            )}
          </div>
          <h1 className="text-display mt-2 text-[22px] font-semibold leading-tight">{product.name}</h1>

          <div className="mt-2 flex items-center gap-3 text-[13px]">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn("size-3.5", i < Math.round(product.rating) ? "fill-amber text-amber" : "text-muted-foreground/30")}
                  strokeWidth={0}
                />
              ))}
              <span className="ml-1 font-medium tabular-nums">{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <button onClick={() => setTab("reviews")} className="text-muted-foreground tabular-nums hover:text-foreground">
              {product.reviewCount} reviews
            </button>
            <span className="text-muted-foreground">·</span>
            <span className="text-success font-medium">In stock</span>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <span className="text-display text-[28px] font-semibold tabular-nums">
              ৳{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <>
                <span className="text-muted-foreground pb-1 text-[14px] line-through tabular-nums">
                  ৳{product.originalPrice.toLocaleString()}
                </span>
                {discount && <span className="text-coral pb-1 text-[13px] font-semibold">Save {discount}%</span>}
              </>
            )}
          </div>
        </section>

        {/* Variants */}
        <section className="mt-5 px-5">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium">Color</p>
              <p className="text-muted-foreground text-[12px]">4 options</p>
            </div>
            <div className="mt-2 flex gap-2.5">
              {colors.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColor(i)}
                  className={cn(
                    "tap-scale tap-scale-active relative size-10 rounded-full ring-offset-2 ring-offset-background",
                    color === i ? "ring-2 ring-primary" : "ring-1 ring-border",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${i + 1}`}
                >
                  {color === i && <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium">Size</p>
              <button className="text-primary text-[12px] font-medium">Size guide</button>
            </div>
            <div className="mt-2 flex gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setVariant(s)}
                  className={cn(
                    "tap-scale tap-scale-active h-10 min-w-12 rounded-2xl border px-3 text-[13px] font-medium transition-colors",
                    variant === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[13px] font-medium">Quantity</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-pill border border-border bg-surface p-1">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="tap-scale tap-scale-active flex size-9 items-center justify-center rounded-full" aria-label="Decrease">
                <Minus className="size-4" strokeWidth={2.25} />
              </button>
              <span className="min-w-8 text-center text-[14px] font-semibold tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="tap-scale tap-scale-active bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full" aria-label="Increase">
                <Plus className="size-4" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="mt-6 px-5">
          <div className="surface-card grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
            {[{ icon: Truck, label: "Free delivery" }, { icon: RotateCcw, label: "7-day returns" }, { icon: ShieldCheck, label: "Verified seller" }].map(({ icon: I, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <I className="text-primary size-4" strokeWidth={2.25} />
                <span className="text-[11px] font-medium leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Description */}
        {product.description && (
          <section className="mt-5 px-5">
            <p className="text-foreground/80 text-[13px] leading-relaxed">{product.description}</p>
          </section>
        )}

        {/* Tabs: Specs / Reviews */}
        <section className="mt-7 px-5">
          <div className="border-border flex gap-6 border-b">
            {(["specs", "reviews"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "relative -mb-px py-2 text-[14px] font-medium capitalize transition-colors",
                  tab === t ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t === "specs" ? "Specifications" : `Reviews (${reviews.length})`}
                {tab === t && <span className="bg-primary absolute inset-x-0 -bottom-px h-0.5 rounded-full" />}
              </button>
            ))}
          </div>

          {tab === "specs" ? (
            <div className="mt-3">
              <p className="text-foreground/80 text-[13px] leading-relaxed">
                A meticulously crafted {product.name.toLowerCase()} from {product.brandName}.
                Designed for everyday excellence with premium materials and a refined finish.
              </p>
              <dl className="surface-card mt-3 divide-y divide-border rounded-2xl p-1">
                {specs.map((s) => (
                  <div key={s.k} className="flex items-start justify-between gap-4 px-3 py-2.5">
                    <dt className="text-muted-foreground text-[12px]">{s.k}</dt>
                    <dd className="text-foreground text-right text-[13px] font-medium">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="mt-3">
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <article key={r.id} className="surface-card rounded-2xl p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary-soft text-primary flex size-8 items-center justify-center rounded-full text-[11px] font-semibold">
                            {(r.authorName ?? "A").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium leading-tight">{r.authorName ?? "Anonymous"}</p>
                            {r.createdAt && (
                              <p className="text-muted-foreground text-[11px]">
                                {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={cn("size-3", j < r.rating ? "fill-amber text-amber" : "text-muted-foreground/30")} strokeWidth={0} />
                          ))}
                        </div>
                      </div>
                      {r.title && <p className="mt-2 text-[13px] font-medium">{r.title}</p>}
                      {r.comment && <p className="text-foreground/85 mt-1 text-[13px] leading-relaxed">{r.comment}</p>}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No reviews yet. Be the first to review this product!
                </div>
              )}

              <ReviewWriter productId={product.id} productName={product.name} />
            </div>
          )}
        </section>

        {/* Related */}
        {relatedAsCards.length > 0 && (
          <section className="mt-8 px-5">
            <div className="flex items-end justify-between">
              <h2 className="text-display text-[18px] font-semibold">You may also like</h2>
              <Link to="/shop" className="text-primary inline-flex items-center text-[12px] font-medium">
                See all <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {relatedAsCards.map((p) => (
                <ProductCard key={p.id} product={p as any} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="glass-strong mobile-shell mx-3 flex items-center gap-2 rounded-3xl p-2 shadow-[var(--shadow-float)]">
          <button
            onClick={handleToggleWishlist}
            aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={liked}
            className="tap-scale tap-scale-active bg-surface flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border"
          >
            <Heart className={cn("size-5 transition-colors", liked ? "fill-coral text-coral" : "text-foreground")} strokeWidth={2.25} />
          </button>
          <Button variant="outline" size="lg" className="h-12 flex-1 rounded-2xl" onClick={handleAddToCart}>
            <ShoppingBag className="size-4" /> Add to cart
          </Button>
          <Button variant="hero" size="lg" className="h-12 flex-1 rounded-2xl" onClick={handleBuyNow}>
            <Zap className="size-4" /> Buy now
          </Button>
        </div>
      </div>

      {/* Video modal */}
      {videoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setVideoOpen(false)}>
          <div className="relative aspect-video w-full max-w-[600px] overflow-hidden rounded-3xl bg-black" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setVideoOpen(false)} className="glass-strong absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-pill text-foreground" aria-label="Close">✕</button>
            <video
              src="https://cdn.coverr.co/videos/coverr-a-girl-shopping-online-9165/1080p.mp4"
              poster={gallery[0]}
              controls autoPlay playsInline
              className="size-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLVideoElement).style.display = "none";
                toast.error("This preview video is unavailable right now.");
                setVideoOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
