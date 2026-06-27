import { createFileRoute, notFound } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ProductListing } from "@/components/shop/ProductListing";
import { CATEGORIES } from "@/data/products";
import { shopSearchSchema } from "./shop";

export const Route = createFileRoute("/shop/$category")({
  validateSearch: zodValidator(shopSearchSchema),
  beforeLoad: ({ params }) => {
    if (!CATEGORIES.some((c) => c.slug === params.category)) throw notFound();
  },
  head: ({ params }) => {
    const cat = CATEGORIES.find((c) => c.slug === params.category);
    const label = cat?.label ?? "Shop";
    return {
      meta: [
        { title: `${label} — Dadar Shop` },
        {
          name: "description",
          content: `Browse ${label.toLowerCase()} on Dadar Shop. Filter by brand, price, and rating.`,
        },
        { property: "og:title", content: `${label} — Dadar Shop` },
      ],
    };
  },
  component: CategoryShopPage,
  notFoundComponent: () => (
    <div className="bg-background flex min-h-screen items-center justify-center px-5 text-center">
      <div>
        <h1 className="text-display text-2xl font-semibold">Category not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The category you’re looking for doesn’t exist.
        </p>
      </div>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="bg-background flex min-h-screen items-center justify-center px-5 text-center">
      <button onClick={reset} className="text-primary text-sm font-medium underline">
        Try again
      </button>
    </div>
  ),
});

function CategoryShopPage() {
  const { category } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProductListing
      categorySlug={category}
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
