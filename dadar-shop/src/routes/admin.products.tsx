import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Boxes,
  Download,
  Filter,
  FolderTree,
  Layers,
  Package,
  Plus,
  Search,
  Tag,
  Tags,
  Upload,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { useAuth } from "@/lib/authStore";
import { API_ORIGIN, AccountApiError } from "@/lib/accountApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Tab =
  | "products"
  | "categories"
  | "brands"
  | "tags"
  | "variants"
  | "inventory"
  | "import"
  | "export";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "brands", label: "Brands", icon: Boxes },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "variants", label: "Variants", icon: Layers },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "import", label: "Bulk Import", icon: Upload },
  { id: "export", label: "Bulk Export", icon: Download },
];

const SIZES = ["XS", "S", "M", "L", "XL"];
const COLORS = ["Black", "White", "Olive", "Beige", "Navy"];

async function adminApi<T = any>(
  path: string,
  token: string | undefined,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api/admin/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AccountApiError(
      (data as any)?.error ?? `Request failed (${res.status})`,
      res.status,
      data,
    );
  }
  return data as T;
}

function useProducts(token: string | undefined) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    return Promise.all([
      adminApi("products", token),
      adminApi("categories", token),
      adminApi("brands", token),
      adminApi("inventory", token),
    ])
      .then(([p, c, b, inv]) => {
        if (Array.isArray(p)) setProducts(p);
        if (Array.isArray(c)) setCategories(c);
        if (Array.isArray(b)) setBrands(b);
        if (Array.isArray(inv)) setInventory(inv);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { products, categories, brands, inventory, loading, refetch };
}

function AdminProducts() {
  const { getToken } = useAuth();
  const token = getToken();
  const [tab, setTab] = useState<Tab>("products");
  const { products, categories, brands, inventory, loading, refetch } = useProducts(token);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: any) {
    setEditing(p);
    setFormOpen(true);
  }

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6">
        <Link
          to="/admin"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3.5" /> Admin Dashboard
        </Link>

        <header className="surface-card mb-4 flex flex-col gap-3 rounded-3xl p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
              <Package className="size-7" /> Product Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Catalog operations — products, categories, brands, tags, variants and stock.
            </p>
          </div>
          <Button variant="hero" size="sm" className="gap-1" onClick={openNew}>
            <Plus className="size-4" /> New product
          </Button>
        </header>

        <nav className="surface-card mb-4 flex gap-1 overflow-x-auto rounded-3xl p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-surface-muted",
                )}
              >
                <Icon className="size-4" /> {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "products" && (
          <ProductsTab
            products={products}
            categories={categories}
            loading={loading}
            token={token}
            refetch={refetch}
            onEdit={openEdit}
          />
        )}
        {tab === "categories" && <CategoriesTab categories={categories} products={products} />}
        {tab === "brands" && <BrandsTab brands={brands} />}
        {tab === "tags" && <TagsTab />}
        {tab === "variants" && <VariantsTab products={products} />}
        {tab === "inventory" && <InventoryTab inventory={inventory} />}
        {tab === "import" && <ImportTab />}
        {tab === "export" && <ExportTab products={products} />}
      </div>

      {formOpen && (
        <ProductFormModal
          product={editing}
          categories={categories}
          token={token}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/* --------------------------- Product form modal -------------------------- */

function ProductFormModal({
  product,
  categories,
  token,
  onClose,
  onSaved,
}: {
  product: any | null;
  categories: any[];
  token: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    categorySlug: product?.categorySlug ?? categories[0]?.slug ?? "",
    brandName: product?.brandName ?? "",
    price: product ? String(product.price) : "",
    description: product?.description ?? "",
    stock: "",
    status: product?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim() || !form.categorySlug || !form.brandName.trim() || !form.price) {
      toast.error("Please fill in name, category, brand and price");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        categorySlug: form.categorySlug,
        brandName: form.brandName.trim(),
        price: Math.round(Number(form.price)),
        description: form.description.trim() || undefined,
        status: form.status,
      };
      if (form.stock.trim() !== "") payload.stock = Math.round(Number(form.stock));

      if (isEdit) {
        await adminApi(`products/${product.id}`, token, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Product updated");
      } else {
        await adminApi("products", token, { method: "POST", body: JSON.stringify(payload) });
        toast.success("Product created");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="bg-background max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-xl"
      >
        <h2 className="text-display mb-4 text-lg font-semibold">
          {isEdit ? "Edit product" : "New product"}
        </h2>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <select
                value={form.categorySlug}
                onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
                className="bg-surface-muted h-9 w-full rounded-2xl px-3 text-sm"
                required
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Brand</Label>
              <Input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Price (BDT)</Label>
              <Input
                type="number"
                min={1}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stock</Label>
              <Input
                type="number"
                min={0}
                placeholder={isEdit ? "Leave blank to keep current" : "0"}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="bg-surface-muted h-9 w-full rounded-2xl px-3 text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="hero" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------- Products ------------------------------- */

function ProductsTab({
  products,
  categories,
  loading,
  token,
  refetch,
  onEdit,
}: {
  products: any[];
  categories: any[];
  loading: boolean;
  token: string | undefined;
  refetch: () => void;
  onEdit: (p: any) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const list = useMemo(() => {
    const needle = q.toLowerCase();
    return products
      .filter((p) => (cat === "all" ? true : p.categorySlug === cat))
      .filter(
        (p) =>
          !needle ||
          p.name.toLowerCase().includes(needle) ||
          (p.brandName ?? "").toLowerCase().includes(needle),
      );
  }, [products, q, cat]);

  const avgPrice = products.length ? Math.round(products.reduce((s, p) => s + p.price, 0) / products.length) : 0;

  async function handleDelete(p: any) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await adminApi(`products/${p.id}`, token, { method: "DELETE" });
      toast.success("Product deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete product");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="Total products" value={products.length.toString()} />
        <KPI label="Categories" value={categories.length.toString()} />
        <KPI label="Brands" value={[...new Set(products.map(p => p.brandName))].length.toString()} />
        <KPI label="Avg price" value={formatBDT(avgPrice)} />
      </div>

      <div className="surface-card flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or brands" className="pl-9" />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="bg-surface-muted h-9 rounded-2xl px-3 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <section className="surface-card overflow-x-auto rounded-3xl p-2">
        {loading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Loading products…</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="py-2">Product</th>
                <th className="py-2">Category</th>
                <th className="py-2">Brand</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Rating</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-border border-t">
                  <td className="text-muted-foreground px-3 py-2 font-mono text-xs">DS-P-{String(p.id).padStart(4, "0")}</td>
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="text-muted-foreground py-2 capitalize">{p.categorySlug}</td>
                  <td className="py-2">{p.brandName}</td>
                  <td className="py-2 text-right font-semibold">{formatBDT(p.price)}</td>
                  <td className="py-2 text-right tabular-nums">{parseFloat(p.rating).toFixed(1)}</td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => onEdit(p)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p)}
                      >
                        {deletingId === p.id ? "…" : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/* ----------------------------- Categories ------------------------------- */

function CategoriesTab({ categories, products }: { categories: any[]; products: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="hero" size="sm" className="gap-1">
          <Plus className="size-4" /> Add category
        </Button>
      </div>
      <section className="grid gap-3 sm:grid-cols-2">
        {categories.map((c) => {
          const count = c.productCount ?? products.filter((p) => p.categorySlug === c.slug).length;
          const subs: string[] = Array.isArray(c.subcategories) ? c.subcategories : [];
          return (
            <div key={c.slug} className="surface-card rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-display text-base font-semibold capitalize">{c.label}</h3>
                <span className="bg-primary-soft text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {count} products
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">Slug: /{c.slug}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {subs.map((s) => (
                  <span key={s} className="bg-surface-muted rounded-full px-2 py-0.5 text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline">Edit</Button>
                <Button size="sm" variant="ghost">Reorder</Button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

/* ------------------------------- Brands --------------------------------- */

function BrandsTab({ brands }: { brands: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="hero" size="sm" className="gap-1">
          <Plus className="size-4" /> Add brand
        </Button>
      </div>
      <section className="surface-card overflow-x-auto rounded-3xl p-2">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Brand</th>
              <th className="py-2">Products</th>
              <th className="py-2">Top category</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-border border-t">
                <td className="px-3 py-2 font-semibold">{b.name}</td>
                <td className="py-2">{b.productCount ?? 0}</td>
                <td className="text-muted-foreground py-2 capitalize">{b.topCategory ?? "—"}</td>
                <td className="py-2 text-right">
                  <Button size="sm" variant="outline">Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* -------------------------------- Tags ---------------------------------- */

function TagsTab() {
  const DEFAULT_TAGS = ["Bestseller", "Flash Deal", "New", "Limited", "Pro pick", "Eco", "Trending", "Premium"];
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState(DEFAULT_TAGS);
  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-col gap-3 rounded-3xl p-5 sm:flex-row">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="New tag name e.g. Eco-friendly"
        />
        <Button
          variant="hero"
          onClick={() => {
            if (newTag.trim()) {
              setTags((t) => [...t, newTag.trim()]);
              setNewTag("");
            }
          }}
          className="gap-1"
        >
          <Plus className="size-4" /> Add tag
        </Button>
      </div>
      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
          <Tags className="size-4" /> All tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="bg-surface-muted hover:bg-primary-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition"
            >
              {t}
              <button
                onClick={() => setTags((arr) => arr.filter((x) => x !== t))}
                className="text-muted-foreground hover:text-rose-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ Variants -------------------------------- */

function VariantsTab({ products }: { products: any[] }) {
  const sample = products.slice(0, 6);
  return (
    <div className="space-y-4">
      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-3 text-sm font-semibold">Variant attributes</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground mb-2 text-[11px] uppercase tracking-wide">Sizes</div>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => (
                <span key={s} className="bg-surface-muted rounded-full px-3 py-1 text-xs font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-2 text-[11px] uppercase tracking-wide">Colors</div>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <span key={c} className="bg-surface-muted rounded-full px-3 py-1 text-xs font-medium">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card overflow-x-auto rounded-3xl p-2">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="py-2">Variant SKU</th>
              <th className="py-2">Size</th>
              <th className="py-2">Color</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {sample.flatMap((p, idx) =>
              SIZES.slice(0, 3).map((s, i) => (
                <tr key={`${p.id}-${s}`} className="border-border border-t">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="text-muted-foreground py-2 font-mono text-xs">
                    DS-V-{String(p.id).padStart(3, "0")}-{s}
                  </td>
                  <td className="py-2">{s}</td>
                  <td className="py-2">{COLORS[(idx + i) % COLORS.length]}</td>
                  <td className="py-2 text-right">{formatBDT(p.price)}</td>
                  <td className="py-2 text-right tabular-nums">{20 + ((idx * 7 + i * 5) % 90)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* ------------------------------ Inventory ------------------------------- */

function InventoryTab({ inventory }: { inventory: any[] }) {
  const low = inventory.filter((r) => r.status === "Low").length;
  const out = inventory.filter((r) => r.status === "Out").length;
  const value = inventory.reduce((s, r) => s + r.onHand * r.price, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="SKUs in stock" value={(inventory.length - out).toString()} />
        <KPI label="Low stock" value={low.toString()} tone="warn" />
        <KPI label="Out of stock" value={out.toString()} tone="danger" />
        <KPI label="Stock value" value={formatBDT(value)} tone="primary" />
      </div>

      <section className="surface-card overflow-x-auto rounded-3xl p-2">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="py-2">Product</th>
              <th className="py-2 text-right">On hand</th>
              <th className="py-2 text-right">Reserved</th>
              <th className="py-2 text-right">Available</th>
              <th className="py-2 text-right">Reorder at</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((r) => (
              <tr key={r.productId} className="border-border border-t">
                <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                  DS-P-{String(r.productId).padStart(4, "0")}
                </td>
                <td className="py-2 font-medium">{r.productName}</td>
                <td className="py-2 text-right tabular-nums">{r.onHand}</td>
                <td className="py-2 text-right tabular-nums">{r.reserved}</td>
                <td className="py-2 text-right tabular-nums">{r.available}</td>
                <td className="text-muted-foreground py-2 text-right tabular-nums">{r.reorderAt}</td>
                <td className="py-2 text-right">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      r.status === "OK" && "bg-emerald-100 text-emerald-800",
                      r.status === "Low" && "bg-amber-100 text-amber-800",
                      r.status === "Out" && "bg-rose-100 text-rose-800",
                    )}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* ------------------------------- Import --------------------------------- */

function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [history] = useState([
    { id: "IMP-118", file: "spring-2026.csv", rows: 412, status: "Completed", at: "2026-06-10" },
    { id: "IMP-117", file: "winter-restock.xlsx", rows: 180, status: "Completed", at: "2026-05-22" },
    { id: "IMP-116", file: "watches-batch.csv", rows: 64, status: "Failed", at: "2026-05-19" },
  ]);

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-3xl p-6">
        <h3 className="text-display flex items-center gap-2 text-sm font-semibold">
          <Upload className="size-4" /> Bulk import products
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Upload a CSV or XLSX with columns: <code>sku, name, category, brand, price, stock, tags</code>.
        </p>

        <label className="bg-surface-muted hover:bg-primary-soft mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border p-10 text-center transition">
          <Upload className="text-muted-foreground size-8" />
          <span className="text-sm font-medium">
            {file ? file.name : "Drop file or click to browse"}
          </span>
          <span className="text-muted-foreground text-[11px]">CSV / XLSX up to 10 MB</span>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        <div className="mt-4 flex gap-2">
          <Button variant="hero" disabled={!file}>Start import</Button>
          <Button variant="outline" className="gap-1">
            <Download className="size-4" /> Download template
          </Button>
        </div>
      </section>

      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-3 text-sm font-semibold">Recent imports</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
            <tr>
              <th className="py-2">Job</th>
              <th>File</th>
              <th className="text-right">Rows</th>
              <th>Status</th>
              <th className="text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-border border-t">
                <td className="py-2 font-medium">{h.id}</td>
                <td className="text-muted-foreground">{h.file}</td>
                <td className="text-right tabular-nums">{h.rows}</td>
                <td>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      h.status === "Completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800",
                    )}
                  >
                    {h.status}
                  </span>
                </td>
                <td className="text-muted-foreground text-right">{h.at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* ------------------------------- Export --------------------------------- */

function ExportTab({ products }: { products: any[] }) {
  const [scope, setScope] = useState<"all" | "low" | "category">("all");
  const [format, setFormat] = useState<"csv" | "xlsx" | "json">("csv");
  const [exporting, setExporting] = useState(false);

  const scoped = scope === "low" ? products.filter((p) => (p.stock ?? 0) < 15) : products;

  function rowsFor() {
    return scoped.map((p) => ({
      sku: `DS-P-${String(p.id).padStart(4, "0")}`,
      name: p.name,
      category: p.categorySlug,
      brand: p.brandName,
      price: p.price,
      rating: parseFloat(p.rating),
    }));
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = rowsFor();
      const stamp = Date.now();

      if (format === "csv") {
        const header = ["sku", "name", "category", "brand", "price", "rating"];
        const csv = [
          header,
          ...rows.map((r) => [r.sku, r.name, r.category, r.brand, r.price.toString(), r.rating.toString()]),
        ]
          .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
          .join("\n");
        triggerDownload(new Blob([csv], { type: "text/csv" }), `dadar-products-${stamp}.csv`);
      } else if (format === "json") {
        triggerDownload(
          new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
          `dadar-products-${stamp}.json`,
        );
      } else {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Products");
        XLSX.writeFile(wb, `dadar-products-${stamp}.xlsx`);
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-3xl p-6">
        <h3 className="text-display flex items-center gap-2 text-sm font-semibold">
          <Download className="size-4" /> Bulk export
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Export your catalog to share with sellers, accountants or marketplaces.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-muted-foreground text-[11px] uppercase tracking-wide">Scope</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="bg-surface-muted mt-1 block h-9 w-full rounded-2xl px-3 text-sm"
            >
              <option value="all">All products ({products.length})</option>
              <option value="low">Low stock only ({products.filter((p) => (p.stock ?? 0) < 15).length})</option>
              <option value="category">By category</option>
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground text-[11px] uppercase tracking-wide">Format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="bg-surface-muted mt-1 block h-9 w-full rounded-2xl px-3 text-sm"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="json">JSON</option>
            </select>
          </label>
        </div>

        <Button variant="hero" className="mt-5 gap-1" onClick={handleExport} disabled={exporting}>
          <Download className="size-4" /> {exporting ? "Exporting…" : `Export ${scoped.length} products`}
        </Button>
      </section>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
      <div
        className={cn(
          "text-display mt-1 text-2xl font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "warn" && "text-amber-700",
          tone === "danger" && "text-rose-700",
          tone === "success" && "text-emerald-700",
        )}
      >
        {value}
      </div>
    </div>
  );
}
