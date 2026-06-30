import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatBDT } from "@/data/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/product-performance")({ component: ProductPerformancePage });

function ProductPerformancePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = { Authorization: `Bearer ${getAdminToken()}` };
    Promise.all([
      fetch(`${API_ORIGIN}/api/admin/products`, { headers: h }).then(r => r.json()),
      fetch(`${API_ORIGIN}/api/admin/inventory`, { headers: h }).then(r => r.json()),
    ]).then(([p, inv]) => {
      if (Array.isArray(p)) setProducts(p);
      if (Array.isArray(inv)) setInventory(inv);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sorted = [...products].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  const maxReviews = sorted[0]?.reviewCount ?? 1;
  const avgRating = products.length ? (products.reduce((s, p) => s + parseFloat(p.rating ?? "0"), 0) / products.length).toFixed(2) : "—";
  const lowStock = inventory.filter(i => i.onHand > 0 && i.onHand < (i.reorderAt ?? 5)).length;
  const outOfStock = inventory.filter(i => i.onHand === 0).length;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Package className="size-7 text-blue-600" /> Product Performance</h1>
        <p className="text-muted-foreground mt-1 text-sm">Rankings, ratings and inventory health for all products.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total SKUs</div><div className="text-display mt-1 text-2xl font-semibold">{products.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Avg Rating</div><div className="text-display mt-1 text-2xl font-semibold text-amber-600">★ {avgRating}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Low Stock</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{lowStock}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Out of Stock</div><div className="text-display mt-1 text-2xl font-semibold text-rose-700">{outOfStock}</div></div>
      </div>
      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">Product Rankings by Reviews</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : (
          <table className="w-full text-sm text-left">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="py-2 pr-4">#</th><th className="pr-4">Product</th><th className="pr-4">Category</th><th className="pr-4">Price</th><th className="pr-4">Rating</th><th className="pr-4">Reviews</th><th>Stock</th></tr>
            </thead>
            <tbody>
              {sorted.slice(0, 20).map((p, i) => {
                const inv = inventory.find(x => x.productId === p.id);
                const stock = inv?.onHand ?? "—";
                const stockColor = typeof stock === "number" ? (stock === 0 ? "text-rose-600" : stock < 15 ? "text-amber-600" : "text-emerald-700") : "";
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                    <td className="pr-4 font-medium">{p.name}</td>
                    <td className="pr-4 text-muted-foreground capitalize">{p.categorySlug}</td>
                    <td className="pr-4 tabular-nums">{formatBDT(p.price)}</td>
                    <td className="pr-4 text-amber-600">★ {p.rating}</td>
                    <td className="pr-4 tabular-nums">{p.reviewCount}</td>
                    <td className={cn("tabular-nums font-semibold", stockColor)}>{stock}</td>
                  </tr>
                );
              })}
              {products.length === 0 && <tr><td colSpan={7} className="text-muted-foreground text-center py-8">No products yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
