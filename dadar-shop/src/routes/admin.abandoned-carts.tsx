import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Send } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/abandoned-carts")({ component: AbandonedCartsPage });

function AbandonedCartsPage() {
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<any[]>("abandoned-carts")
      .then(d => { if (Array.isArray(d)) setCarts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function remind(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/abandoned-carts/${id}/remind`, {
      method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` },
    });
    if (res.ok) toast.success("Reminder sent!"); else toast.error("Failed to send reminder");
  }

  const totalValue = carts.reduce((s, c) => s + (c.total ?? 0), 0);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><ShoppingCart className="size-7" /> Abandoned Carts</h1>
        <p className="text-muted-foreground mt-1 text-sm">Recover revenue from customers who left without checking out.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Abandoned Carts</div><div className="text-display mt-1 text-2xl font-semibold text-rose-600">{carts.length}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Potential Revenue</div><div className="text-display mt-1 text-2xl font-semibold text-amber-600">{formatBDT(totalValue)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Avg Cart Value</div><div className="text-display mt-1 text-2xl font-semibold">{carts.length ? formatBDT(Math.round(totalValue / carts.length)) : "—"}</div></div>
      </div>

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : carts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No abandoned carts found. Great retention!</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="py-2 pr-4">Customer</th><th className="pr-4">Items</th><th className="pr-4">Cart Value</th><th className="pr-4">Abandoned</th><th></th></tr>
            </thead>
            <tbody>
              {carts.map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2 pr-4 font-medium">{c.customerName ?? c.customerEmail ?? "Guest"}</td>
                  <td className="pr-4">{c.itemCount ?? "—"}</td>
                  <td className="pr-4 font-semibold tabular-nums">{formatBDT(c.total ?? 0)}</td>
                  <td className="pr-4 text-muted-foreground text-xs">{c.abandonedAt ? new Date(c.abandonedAt).toLocaleString() : "—"}</td>
                  <td><Button size="sm" variant="outline" onClick={() => remind(c.id)}><Send className="size-3.5 mr-1" />Remind</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
