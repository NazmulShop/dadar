import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ProductListing } from "@/components/shop/ProductListing";
import { BRANDS, PRICE_BUCKETS, SORT_OPTIONS } from "@/data/products";

const priceIds = PRICE_BUCKETS.map((p) => p.id) as [string, ...string[]];
const sortIds = SORT_OPTIONS.map((s) => s.id) as [string, ...string[]];

export const shopSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "all").default("all"),
  subcategory: fallback(z.string(), "All").default("All"),
  brands: fallback(z.array(z.enum(BRANDS as [string, ...string[]])), []).default([]),
  price: fallback(z.enum(priceIds), "any").default("any"),
  minRating: fallback(z.number().min(0).max(5), 0).default(0),
  sort: fallback(z.enum(sortIds), "popular").default("popular"),
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/shop")({
  validateSearch: zodValidator(shopSearchSchema),
  head: () => ({
    meta: [
      { title: "Shop all — Dadar Shop" },
      {
        name: "description",
        content:
          "Browse all curated products on Dadar Shop. Filter by brand, price, rating, and category.",
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProductListing
      search={search as any}
      updateSearch={(next) =>
        navigate({
          search: ((prev: Record<string, unknown>) => ({ ...prev, ...next })) as never,
          replace: true,
        })
      }

    />
  );
}
