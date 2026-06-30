import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Warehouse, Search, AlertTriangle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/adminApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/products/inventory")({ component: InventoryPage });

function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminFetch<any[]>("inventory")
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    items.filter(i => !q || i.name?.toLowerCase().includes(q.toLowerCase()) || i.sku?.toLowerCase().includes(q.toLowerCase())),
    [items, q]);

  const lowStock = items.filter(i => (i.stock ?? 0) > 0 && (i.stock ?? 0) <= 5).length;
  const outOfStock = items.filter(i => (i.stock ?? 0) === 0).length;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Warehouse className="size-7" /> Inventory</h1>
        <p className="text-muted-foreground mt-1 text-sm">Track stock levels across all products.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[{ label: "Total SKUs", value: items.length }, { label: "Low Stock", value: lowStock, warn: true }, { label: "Out of Stock", value: outOfStock, danger: true }].map(s => (
            <div key={s.label} className={cn("rounded-2xl p-3", s.danger ? "bg-rose-50" : s.warn ? "bg-amber-50" : "bg-surface-muted")}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className={cn("mt-1 text-lg font-semibold", s.danger ? "text-rose-700" : s.warn ? "text-amber-700" : "")}>{s.value}</div>
            </div>
          ))}
        </div>
      </header>
      <div className="surface-card mb-4 rounded-3xl p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or SKU…" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted">
                <tr>{["Product", "SKU", "Stock", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(i => {
                  const stock = i.stock ?? 0;
                  const status = stock === 0 ? "Out of Stock" : stock <= 5 ? "Low Stock" : "In Stock";
                  const tone = stock === 0 ? "destructive" : stock <= 5 ? "secondary" : "default";
                  return (
                    <tr key={i.id} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-3 font-medium">{i.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{i.sku ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {stock <= 5 && <AlertTriangle className="size-3 text-amber-600" />}
                          <span className={cn("font-semibold", stock === 0 ? "text-rose-700" : stock <= 5 ? "text-amber-700" : "")}>{stock}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant={tone as any}>{status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
