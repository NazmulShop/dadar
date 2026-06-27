import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Laptop, Headphones, ShoppingBag, Shirt, Gift, HeartPulse, Watch, Sparkles,
  ChevronRight, Mail, Flame, TrendingUp, Leaf,
} from "lucide-react";

import { StickyHeader } from "@/components/shop/StickyHeader";
import { HeroSlider } from "@/components/shop/HeroSlider";
import { FlashSale } from "@/components/shop/FlashSale";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { ProductCard, type Product } from "@/components/shop/ProductCard";
import { CustomerReviews } from "@/components/shop/CustomerReviews";
import { Footer } from "@/components/shop/Footer";
import { FloatingBottomNav } from "@/components/shop/FloatingBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_ORIGIN } from "@/lib/accountApi";

import productWatch from "@/assets/product-watch.jpg";
import productBag from "@/assets/product-bag.jpg";
import productHeadphones from "@/assets/product-headphones.jpg";
import productSneaker from "@/assets/product-sneaker.jpg";

// Fallback image pool for products that don't have a stored image URL yet
const IMAGE_POOL = [productWatch, productBag, productHeadphones, productSneaker];
let imgIdx = 0;
function nextFallback() { const i = imgIdx % IMAGE_POOL.length; imgIdx++; return IMAGE_POOL[i]; }

function apiToProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    image: p.imageUrl ?? nextFallback(),
    price: p.price,
    originalPrice: p.originalPrice ?? undefined,
    rating: p.rating ?? 0,
    reviews: p.reviewCount ?? 0,
    seller: p.sellerName ?? p.brandName,
    badge: p.badge ?? undefined,
  };
}

function useHomepageProducts() {
  const [flash, setFlash] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);

  useEffect(() => {
    imgIdx = 0; // reset index each mount

    // Flash sale — products with a badge or discount
    fetch(`${API_ORIGIN}/api/shop/products?sort=popular&page=1`)
      .then((r) => r.json())
      .then((d) => {
        const items: Product[] = (d.items ?? []).map(apiToProduct);
        const discounted = items.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 4);
        setFlash(discounted.length >= 2 ? discounted : items.slice(0, 4));
      })
      .catch(() => {});

    // Featured — highest rated
    fetch(`${API_ORIGIN}/api/shop/products?sort=rating&page=1`)
      .then((r) => r.json())
      .then((d) => { setFeatured((d.items ?? []).slice(0, 4).map(apiToProduct)); })
      .catch(() => {});

    // Best sellers — most reviewed
    fetch(`${API_ORIGIN}/api/shop/products?sort=popular&page=1`)
      .then((r) => r.json())
      .then((d) => { setBestsellers((d.items ?? []).slice(0, 4).map(apiToProduct)); })
      .catch(() => {});

    // New arrivals — newest first
    fetch(`${API_ORIGIN}/api/shop/products?sort=newest&page=1`)
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items ?? []).slice(0, 4).map(apiToProduct);
        setNewArrivals(items.map((p) => ({ ...p, badge: p.badge ?? "New" })));
      })
      .catch(() => {});
  }, []);

  return { flash, featured, bestsellers, newArrivals };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dadar Shop — Shop Anything, Beautifully" },
      {
        name: "description",
        content:
          "A premium mobile-first marketplace. Curated products, verified sellers, fast delivery across Bangladesh.",
      },
      { property: "og:title", content: "Dadar Shop" },
      { property: "og:description", content: "Curated, verified, delivered." },
    ],
  }),
  component: Home,
});

const categories = [
  { label: "Electronics", icon: Laptop, count: null, tone: "primary" as const, categorySlug: "electronics" },
  { label: "Accessories", icon: Headphones, count: null, categorySlug: "electronics", subcategory: "Headphones" },
  { label: "Bags", icon: ShoppingBag, count: null, tone: "amber" as const, categorySlug: "bags" },
  { label: "Sharee", icon: Shirt, count: null, categorySlug: "fashion", subcategory: "Sharee" },
  { label: "Weddings", icon: Sparkles, count: null, tone: "coral" as const, categorySlug: "weddings" },
  { label: "Health", icon: HeartPulse, count: null, categorySlug: "beauty" },
  { label: "Gifts", icon: Gift, count: null, categorySlug: "weddings", subcategory: "Gifts" },
  { label: "Watches", icon: Watch, count: null, categorySlug: "watches" },
];

function Home() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const { flash, featured, bestsellers, newArrivals } = useHomepageProducts();

  return (
    <div className="bg-background min-h-screen">
      <div className="mobile-shell">
        <StickyHeader />

        {/* Greeting / Hero */}
        <section className="px-5 pt-5">
          <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
          </p>
          <h1 className="text-display mt-1 text-[26px] leading-[1.1]">
            Shop anything,
            <span className="text-serif text-primary italic font-normal"> beautifully</span>.
          </h1>
        </section>

        <section className="mt-5 px-5">
          <HeroSlider />
        </section>

        {/* Flash sale */}
        {flash.length > 0 && (
          <section className="mt-7 px-5">
            <FlashSale products={flash} />
          </section>
        )}

        {/* Categories */}
        <section className="mt-9 px-5">
          <SectionHeader
            kicker="Browse"
            title="Shop by category"
            subtitle="Eight worlds, one marketplace"
          />
          <div className="mt-4 grid grid-cols-4 gap-y-5">
            {categories.map((c) => (
              <CategoryCard key={c.label} {...c} />
            ))}
          </div>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mt-10 px-5">
            <SectionHeader
              kicker={<><Sparkles className="size-3" /> Featured</>}
              title="Picked by our editors"
              subtitle="Limited-run finds we love this week"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Best sellers — horizontal */}
        {bestsellers.length > 0 && (
          <section className="mt-10">
            <div className="px-5">
              <SectionHeader
                kicker={<><TrendingUp className="size-3" /> Best sellers</>}
                title="Most-loved this month"
                subtitle="What Bangladesh is buying"
              />
            </div>
            <div className="hide-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
              {bestsellers.map((p) => (
                <div key={p.id} className="w-[180px] shrink-0 snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* New arrivals */}
        {newArrivals.length > 0 && (
          <section className="mt-10 px-5">
            <SectionHeader
              kicker={<><Leaf className="size-3" /> Just landed</>}
              title="New arrivals"
              subtitle="Fresh drops, updated daily"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="mt-10">
          <div className="px-5">
            <SectionHeader
              kicker="Loved by shoppers"
              title="From our customers"
              subtitle="Verified reviews from real orders"
            />
          </div>
          <div className="mt-4">
            <CustomerReviews />
          </div>
        </section>

        {/* Newsletter */}
        <section className="mt-10 px-5">
          <div className="bg-hero-gradient text-primary-foreground relative overflow-hidden rounded-3xl p-6 shadow-card">
            <div className="bg-amber/25 absolute -right-10 -top-10 size-40 rounded-full blur-3xl" />
            <span className="bg-amber text-amber-foreground inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
              <Mail className="size-3" /> Dadar Letter
            </span>
            <h3 className="text-display mt-3 text-xl font-semibold leading-tight">
              Early access to weekly drops
            </h3>
            <p className="mt-1.5 text-[13px] opacity-85">
              Member-only pricing, flash deals & curated editorials. One email a week, never spam.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newsletterEmail.trim() || !/^\S+@\S+\.\S+$/.test(newsletterEmail)) {
                  toast.error("Enter a valid email");
                  return;
                }
                toast.success("Subscribed! Watch your inbox for the Dadar Letter.");
                setNewsletterEmail("");
              }}
              className="mt-4 flex gap-2"
            >
              <Input
                type="email"
                required
                placeholder="you@example.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-white/12 border-white/20 text-primary-foreground placeholder:text-white/55 focus-visible:border-white/60 focus-visible:ring-white/20"
              />
              <Button type="submit" variant="amber" size="default">
                Join
              </Button>
            </form>
            <p className="mt-3 text-[10px] opacity-70">
              By subscribing you agree to our Privacy Policy.
            </p>
          </div>
        </section>

        <Footer />
      </div>

      <FloatingBottomNav />
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker && (
          <span className="text-primary inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
            {kicker}
          </span>
        )}
        <h2 className="text-display mt-1 text-xl font-semibold leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Link to="/shop" className="text-primary shrink-0 inline-flex items-center gap-0.5 text-[13px] font-medium">
        See all <ChevronRight className="size-4" />
      </Link>
    </header>
  );
}
