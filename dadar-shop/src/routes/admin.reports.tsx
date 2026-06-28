import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download, BarChart3, TrendingUp, Users, Package } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/data/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_ORIGIN}/api/admin/dashboard`, { headers: h }).then(r => r.json()),
      fetch(`${API_ORIGIN}/api/admin/analytics`, { headers: h }).then(r => r.json()),
    ]).then(([dash, analytics]) => {
      setData({ ...dash, ...analytics });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  }

  const REPORTS = [
    { id: "revenue", label: "Revenue Report", icon: TrendingUp, desc: "Monthly revenue breakdown and growth trends", color: "text-emerald-600" },
    { id: "orders", label: "Orders Report", icon: Package, desc: "Order volume, status distribution, fulfillment rate", color: "text-blue-600" },
    { id: "customers", label: "Customer Report", icon: Users, desc: "Customer acquisition, retention, loyalty tiers", color: "text-violet-600" },
    { id: "products", label: "Product Report", icon: BarChart3, desc: "Top products, low stock, category performance", color: "text-amber-600" },
  ];

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><FileText className="size-7" /> Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">Generate and download live data reports.</p>
      </header>

      {loading ? <p className="text-muted-foreground text-center py-12">Loading report data…</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-4 mb-4">
            <div className="surface-card rounded-3xl p-4">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Revenue</div>
              <div className="text-display mt-1 text-2xl font-semibold text-primary">{data ? formatBDT(data.totalRevenue ?? 0) : "—"}</div>
            </div>
            <div className="surface-card rounded-3xl p-4">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Orders</div>
              <div className="text-display mt-1 text-2xl font-semibold">{(data?.orders ?? []).length}</div>
            </div>
            <div className="surface-card rounded-3xl p-4">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Customers</div>
              <div className="text-display mt-1 text-2xl font-semibold">{data?.customerCount ?? data?.totalCustomers ?? "—"}</div>
            </div>
            <div className="surface-card rounded-3xl p-4">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Products</div>
              <div className="text-display mt-1 text-2xl font-semibold">{(data?.allProducts ?? []).length}</div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {REPORTS.map(r => {
              const Icon = r.icon;
              return (
                <div key={r.id} className="surface-card rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("size-5", r.color)} />
                        <h3 className="font-semibold text-sm">{r.label}</h3>
                      </div>
                      <p className="text-muted-foreground text-xs">{r.desc}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (r.id === "revenue" && data?.months && data?.revenueSeries) {
                        downloadCSV([["Month", "Revenue (BDT)"], ...data.months.map((m: string, i: number) => [m, data.revenueSeries[i]])], "revenue-report.csv");
                      } else if (r.id === "orders" && data?.orders) {
                        downloadCSV([["Order ID", "Customer", "Status", "Payment", "Total"], ...data.orders.map((o: any) => [o.id, o.customerName, o.status, o.paymentMethod, o.total])], "orders-report.csv");
                      } else if (r.id === "products" && data?.allProducts) {
                        downloadCSV([["ID", "Name", "Category", "Price", "Rating", "Reviews"], ...data.allProducts.map((p: any) => [p.id, p.name, p.categorySlug, p.price, p.rating, p.reviewCount])], "products-report.csv");
                      } else {
                        downloadCSV([["Report", "Generated"], [r.label, new Date().toISOString()]], `${r.id}-report.csv`);
                      }
                    }}>
                      <Download className="size-3.5 mr-1" /> Download CSV
                    </Button>
                  </div>
                  <div className="mt-4 h-1.5 bg-surface-muted rounded-full" />
                </div>
              );
            })}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
