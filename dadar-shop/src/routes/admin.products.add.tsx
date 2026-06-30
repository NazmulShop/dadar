import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Package, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/add")({ component: AddProductPage });

function AddProductPage() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", price: "", comparePrice: "",
    sku: "", stock: "", categoryId: "", brandId: "", imageUrl: "",
  });

  useEffect(() => {
    adminFetch<any[]>("categories").then(d => setCats(Array.isArray(d) ? d : [])).catch(() => {});
    adminFetch<any[]>("brands").then(d => setBrands(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const F = ({ label, k, type = "text", placeholder = "" }: { label: string; k: keyof typeof form; type?: string; placeholder?: string }) => (
    <div>
      <Label className="text-sm mb-1 block">{label}</Label>
      <Input type={type} placeholder={placeholder} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
    </div>
  );

  async function save() {
    if (!form.name || !form.price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({
          name: form.name, description: form.description,
          price: parseFloat(form.price) || 0,
          comparePrice: parseFloat(form.comparePrice) || undefined,
          sku: form.sku, stock: parseInt(form.stock) || 0,
          categoryId: form.categoryId || undefined,
          brandId: form.brandId || undefined,
          imageUrl: form.imageUrl || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) { toast.success("Product created"); navigate({ to: "/admin/products" }); }
      else toast.error(d.error ?? "Failed to create product");
    } catch { toast.error("Failed"); }
    setSaving(false);
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Package className="size-7" /> Add Product</h1>
        <p className="text-muted-foreground mt-1 text-sm">Create a new product in the catalogue.</p>
      </header>
      <div className="space-y-4">
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Basic Information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><F label="Product Name *" k="name" placeholder="Enter product name" /></div>
            <div className="sm:col-span-2">
              <Label className="text-sm mb-1 block">Description</Label>
              <Textarea placeholder="Product description…" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <F label="Image URL" k="imageUrl" placeholder="https://…" />
          </div>
        </div>
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Pricing & Stock</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <F label="Price (৳) *" k="price" type="number" placeholder="0" />
            <F label="Compare Price (৳)" k="comparePrice" type="number" placeholder="0" />
            <F label="SKU" k="sku" placeholder="e.g. PROD-001" />
            <F label="Stock Quantity" k="stock" type="number" placeholder="0" />
          </div>
        </div>
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Classification</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-sm mb-1 block">Category</Label>
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">No category</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Brand</Label>
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.brandId} onChange={e => setForm(p => ({ ...p, brandId: e.target.value }))}>
                <option value="">No brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/admin/products" })}>Cancel</Button>
          <Button variant="hero" onClick={save} disabled={saving}><Save className="size-4 mr-1" />{saving ? "Saving…" : "Create Product"}</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
