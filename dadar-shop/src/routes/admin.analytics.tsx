import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Filter as FunnelIcon, Globe, ShoppingCart, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { useAuth } from "@/lib/authStore";
import { API_ORIGIN } from "@/lib/accountApi";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

type Tab = "revenue" | "traffic" | "products" | "customers" | "funnel";

interface AnalyticsData {
  months: string[];
  revenueSeries: number[];
  ordersSeries: number[];
  totalRevenue: number;
  bestMonth: number;
  avgMonthly: number;
  productCount: number;
  customerCount: number;
  lowStock: number;
  avgRating: string;
}

function useAnalytics() {
  const { getToken } = useAuth();
  const [data, setData] = useState<AnalyticsData>({
    months: [],
    revenueSeries: [],
    ordersSeries: [],
    totalRevenue: 0,
    bestMonth: 0,
    avgMonthly: 0,
    productCount: 0,
    customerCount: 0,
    lowStock: 0,
    avgRating: "4.6",
  });

  useEffect(() => {
    const token = getToken();
    fetch(`${API_ORIGIN}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d && !d.error) setData(d); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return data;
}

function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("revenue");
  const analytics = useAnalytics();

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "revenue", label: "Revenue", icon: BarChart3 },
    { id: "traffic", label: "Traffic", icon: Globe },
    { id: "products", label: "Products", icon: ShoppingCart },
    { id: "customers", label: "Customers", icon: Users },
    { id: "funnel", label: "Funnel", icon: FunnelIcon },
  ];

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="size-3.5" /> Back to admin
        </Link>
        <header className="surface-card mb-4 rounded-3xl p-6">
          <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
            <BarChart3 className="size-7" /> Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Revenue, traffic, product, customer and funnel insights.</p>
        </header>

        <nav className="surface-card -mx-1 mb-4 flex gap-1 overflow-x-auto rounded-3xl p-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition",
                  tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted",
                )}
              >
                <Icon className="size-4" /> {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "revenue" && <Revenue analytics={analytics} />}
        {tab === "traffic" && <Traffic />}
        {tab === "products" && <Products analytics={analytics} />}
        {tab === "customers" && <Customers analytics={analytics} />}
        {tab === "funnel" && <Funnel analytics={analytics} />}
      </div>
    </div>
  );
}

function Revenue({ analytics }: { analytics: AnalyticsData }) {
  const { months, revenueSeries, totalRevenue, bestMonth, avgMonthly } = analytics;
  const max = Math.max(...revenueSeries, 1);
  const last = revenueSeries[revenueSeries.length - 1] ?? 0;
  const prev = revenueSeries[revenueSeries.length - 2] ?? last;
  const mom = prev === 0 ? "0.0" : ((last - prev) / prev * 100).toFixed(1);

  return (
    <div className="space-y-4">
      <KGrid items={[
        { label: "Revenue (6m)", value: formatBDT(totalRevenue) },
        { label: "Best month", value: formatBDT(bestMonth) },
        { label: "Avg / month", value: formatBDT(avgMonthly) },
        { label: "MoM growth", value: `${parseFloat(mom) >= 0 ? "+" : ""}${mom}%` },
      ]} />
      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-4 text-sm font-semibold">Monthly revenue (BDT)</h3>
        <div className="flex h-56 items-end gap-3">
          {revenueSeries.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="bg-primary w-full rounded-t-xl" style={{ height: `${(v / max) * 100}%` }} />
              <div className="text-muted-foreground text-[10px]">{months[i]}</div>
              <div className="text-[10px] font-semibold tabular-nums">৳{(v / 1000).toFixed(0)}k</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Traffic() {
  return (
    <div className="space-y-4">
      <section className="surface-card rounded-3xl p-5">
        <p className="text-muted-foreground text-sm text-center py-6">
          Traffic analytics require integration with an analytics provider (e.g. Google Analytics, Plausible).<br />
          Once connected, visitor counts, traffic sources, and landing pages will appear here.
        </p>
      </section>
    </div>
  );
}

function Products({ analytics }: { analytics: AnalyticsData }) {
  const totalOrders = analytics.ordersSeries.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <KGrid items={[
        { label: "SKUs", value: analytics.productCount.toString() },
        { label: "Orders (6m)", value: totalOrders.toLocaleString() },
        { label: "Low stock", value: analytics.lowStock.toString() },
        { label: "Avg rating", value: analytics.avgRating },
      ]} />
      <section className="surface-card rounded-3xl p-5">
        <p className="text-muted-foreground text-sm text-center py-4">
          Per-product sales figures will appear here once order-to-product linking is complete.
        </p>
      </section>
    </div>
  );
}

function Customers({ analytics }: { analytics: AnalyticsData }) {
  return (
    <div className="space-y-4">
      <KGrid items={[
        { label: "Total customers", value: analytics.customerCount.toLocaleString() },
        { label: "Products", value: analytics.productCount.toString() },
      ]} />
      <section className="surface-card rounded-3xl p-5">
        <p className="text-muted-foreground text-sm text-center py-4">
          Customer cohort breakdown (new vs returning vs VIP) will appear here once retention data is available.
        </p>
      </section>
    </div>
  );
}

function Funnel({ analytics }: { analytics: AnalyticsData }) {
  const totalOrders = analytics.ordersSeries.reduce((a, b) => a + b, 0);
  return (
    <section className="surface-card rounded-3xl p-5">
      <h3 className="text-display mb-4 text-sm font-semibold">Order funnel</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total orders (6m)</span>
          <span className="font-semibold tabular-nums">{totalOrders.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Delivered</span>
          <span className="font-semibold tabular-nums text-emerald-700">
            {analytics.ordersSeries.length > 0 ? totalOrders.toLocaleString() : "—"}
          </span>
        </div>
        <p className="text-muted-foreground text-xs pt-2">
          Full funnel metrics (visits → views → cart → checkout → purchase) require analytics provider integration.
        </p>
      </div>
    </section>
  );
}

function KGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="surface-card rounded-3xl p-4">
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{i.label}</div>
          <div className="text-display mt-1 text-2xl font-semibold tabular-nums">{i.value}</div>
        </div>
      ))}
    </div>
  );
}


