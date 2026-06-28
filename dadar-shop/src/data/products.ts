import type { Product } from "@/components/shop/ProductCard";

export interface CatalogProduct extends Product {
  category: string;
  subcategory: string;
  brand: string;
}

export const CATEGORIES = [
  {
    slug: "electronics",
    label: "Electronics",
    subcategories: ["All", "Headphones", "Watches", "Speakers", "Cameras"],
  },
  {
    slug: "fashion",
    label: "Fashion",
    subcategories: ["All", "Sharee", "Sneakers", "Knitwear", "Eyewear"],
  },
  {
    slug: "bags",
    label: "Bags",
    subcategories: ["All", "Tote", "Crossbody", "Backpack"],
  },
  {
    slug: "beauty",
    label: "Beauty",
    subcategories: ["All", "Skincare", "Fragrance", "Hair"],
  },
  {
    slug: "weddings",
    label: "Weddings",
    subcategories: ["All", "Bridal", "Groom", "Gifts"],
  },
  {
    slug: "watches",
    label: "Watches",
    subcategories: ["All", "Analog", "Smart", "Vintage"],
  },
] as const;

export const BRANDS = [
  "Maison Dhaka",
  "Tempora Studio",
  "Acoustica BD",
  "Pace & Co.",
  "Mira Beauty",
  "Oat & Wool",
  "Lensoria",
];

/**
 * NOTE: The PRODUCTS static array has been removed.
 * All product data is fetched from the API (/api/shop/products).
 * The filterAndSort function below is kept for reference but no longer used
 * in the UI — filtering/sorting happens server-side.
 */

export const SORT_OPTIONS = [
  { id: "popular", label: "Most popular" },
  { id: "newest", label: "Newest first" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "rating", label: "Highest rated" },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]["id"];

export const PRICE_BUCKETS = [
  { id: "any", label: "Any price", min: 0, max: 100000 },
  { id: "under-2k", label: "Under ৳2,000", min: 0, max: 2000 },
  { id: "2-5k", label: "৳2,000 – ৳5,000", min: 2000, max: 5000 },
  { id: "5-10k", label: "৳5,000 – ৳10,000", min: 5000, max: 10000 },
  { id: "over-10k", label: "Over ৳10,000", min: 10000, max: 100000 },
] as const;

export type PriceBucketId = (typeof PRICE_BUCKETS)[number]["id"];

export interface ListingFilters {
  q: string;
  category: string;
  subcategory: string;
  brands: string[];
  price: PriceBucketId;
  minRating: number;
  sort: SortId;
  page: number;
}

export const PAGE_SIZE = 8;

export function filterAndSort(
  products: CatalogProduct[],
  f: ListingFilters,
): { items: CatalogProduct[]; total: number } {
  const bucket = PRICE_BUCKETS.find((b) => b.id === f.price) ?? PRICE_BUCKETS[0];
  const q = f.q.trim().toLowerCase();
  // Tokenized search: every typed term must match somewhere in the haystack
  // (name + brand + subcategory + category + seller). Case-insensitive.
  const qTokens = q ? q.split(/[\s,]+/).filter(Boolean) : [];
  const categoryFilter = (f.category || "all").toLowerCase();
  const subcategoryFilter = f.subcategory || "All";
  const brandSet = new Set(f.brands);

  let list = products.filter((p) => {
    if (categoryFilter !== "all" && p.category.toLowerCase() !== categoryFilter) return false;
    if (subcategoryFilter !== "All" && p.subcategory !== subcategoryFilter) return false;
    if (brandSet.size > 0 && !brandSet.has(p.brand)) return false;
    if (p.price < bucket.min || p.price > bucket.max) return false;
    if (p.rating < f.minRating) return false;
    if (qTokens.length > 0) {
      const haystack =
        `${p.name} ${p.brand} ${p.subcategory} ${p.category} ${p.seller ?? ""}`.toLowerCase();
      for (const t of qTokens) {
        if (!haystack.includes(t)) return false;
      }
    }
    return true;
  });

  list = list.slice().sort((a, b) => {
    switch (f.sort) {
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      case "rating": return b.rating - a.rating;
      case "newest": return a.id < b.id ? 1 : -1;
      case "popular":
      default: return b.reviews - a.reviews;
    }
  });

  const total = list.length;
  const page = Math.max(1, f.page || 1);
  const start = (page - 1) * PAGE_SIZE;
  return { items: list.slice(start, start + PAGE_SIZE), total };
}
