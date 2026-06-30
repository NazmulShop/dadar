import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/authStore";
import { API_ORIGIN } from "@/lib/accountApi";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  DollarSign,
  Mail,
  MessageSquare,
  PackageCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Truck,
  Users,
  Flag,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
  formatBDT,
  formatDay,
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_EVENT_LABEL,
  type Review,
} from "@/data/account";
import { COURIERS, PRIMARY_COURIERS } from "@/data/couriers";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

type Tab =
  | "revenue"
  | "sales"
  | "customers"
  | "products"
  | "orders"
  | "delivery"
  | "notifications"
  | "reviews";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "sales", label: "Sales", icon: BarChart3 },
  { id: "customers", label: "Customers", icon: Users },
  { id: "products", label: "Products", icon: Boxes },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "reviews", label: "Reviews", icon: Star },
];

interface DashboardData {
  orders: any[];
  allProducts: any[];
  inventory: any[];
  months: string[];
  revenueSeries: number[];
  ordersSeries: number[];
  statusTotals: Record<string, number>;
  totalCustomers: number;
}

function useAdminDashboard() {
  const { getToken } = useAuth();
  const [data, setData] = useState<DashboardData>({
    orders: [],
    allProducts: [],
    inventory: [],
    months: [],
    revenueSeries: [],
    ordersSeries: [],
    statusTotals: {},
    totalCustomers: 0,
  });

  useEffect(() => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_ORIGIN}/api/admin/dashboard`, { headers }).then((r) => r.json()),
      fetch(`${API_ORIGIN}/api/admin/inventory`, { headers }).then((r) => r.json()),
    ])
      .then(([dash, inv]) => {
        if (dash && !dash.error) {
          setData({ ...dash, inventory: Array.isArray(inv) ? inv : [] });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return data;
}

function useAdminReviews() {
  const { getToken } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  useEffect(() => {
    const token = getToken();
    fetch(`${API_ORIGIN}/api/admin/reviews`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setReviews(d); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { reviews, setReviews };
}

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("revenue");
  const dash = useAdminDashboard();
  const { reviews, setReviews } = useAdminReviews();

  return (
    <AdminLayout>
      <header className="surface-card mb-4 flex flex-col gap-3 rounded-3xl p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live analytics across revenue, sales, customers and operations.
          </p>
        </div>
        <Button variant="hero" size="sm" asChild>
          <Link to="/seller">Seller portal</Link>
        </Button>
      </header>

      <nav className="surface-card -mx-1 mb-4 flex gap-1 overflow-x-auto rounded-3xl p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "tap-scale tap-scale-active inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition",
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

      {tab === "revenue" && <RevenuePanel months={dash.months} revenueSeries={dash.revenueSeries} ordersSeries={dash.ordersSeries} orders={dash.orders} />}
      {tab === "sales" && <SalesPanel months={dash.months} ordersSeries={dash.ordersSeries} />}
      {tab === "customers" && <CustomersPanel totalCustomers={dash.totalCustomers} />}
      {tab === "products" && <ProductsPanel products={dash.allProducts} inventory={dash.inventory} />}
      {tab === "orders" && <OrdersPanel orders={dash.orders} ordersSeries={dash.ordersSeries} statusTotals={dash.statusTotals} />}
      {tab === "delivery" && <DeliveryPanel />}
      {tab === "notifications" && <NotificationsPanel />}
      {tab === "reviews" && <ReviewsPanel reviews={reviews} setReviews={setReviews} />}
    </AdminLayout>
  );
}

/* ------------------------------- Revenue -------------------------------- */

function RevenuePanel({ months, revenueSeries, ordersSeries, orders }: { months: string[]; revenueSeries: number[]; ordersSeries: number[]; orders: any[] }) {
  const total = revenueSeries.reduce((s, n) => s + n, 0);
  const last = revenueSeries[revenueSeries.length - 1] ?? 0;
  const prev = revenueSeries[revenueSeries.length - 2] ?? last;
  const growth = prev === 0 ? 0 : ((last - prev) / prev) * 100;
  const lastOrders = ordersSeries[ordersSeries.length - 1] ?? 1;
  const refundTotal = orders.filter(o => o.status === "Returned" || o.status === "Cancelled").reduce((s: number, o: any) => s + (o.total ?? 0), 0);

  // Payment method breakdown from real orders
  const PAYMENT_COLORS: Record<string, string> = { bKash: "#E2136E", Nagad: "#EB6E1F", Card: "#1A1F71", COD: "#0F766E", Rocket: "#8C2D8D" };
  const pmTotals: Record<string, number> = {};
  for (const o of orders) {
    if (o.paymentMethod) pmTotals[o.paymentMethod] = (pmTotals[o.paymentMethod] ?? 0) + (o.total ?? 0);
  }
  const pmGrand = Object.values(pmTotals).reduce((a, b) => a + b, 0) || 1;
  const paymentParts = Object.entries(pmTotals).map(([method, amt]) => ({
    label: method,
    value: Math.round((amt / pmGrand) * 100),
    color: PAYMENT_COLORS[method] ?? "#94A3B8",
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="Revenue (6m)" value={formatBDT(total)} delta={growth} tone="primary" />
        <KPI label="This month" value={formatBDT(last)} delta={growth} tone="success" />
        <KPI label="Avg order value" value={formatBDT(Math.round(last / Math.max(lastOrders, 1)))} delta={0} />
        <KPI label="Refunds" value={formatBDT(refundTotal)} delta={0} tone="warn" />
      </div>

      <section className="surface-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-display text-sm font-semibold">Revenue trend</h3>
          <span className="text-muted-foreground text-xs">Monthly · BDT</span>
        </div>
        <BarChart labels={months} values={revenueSeries} formatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
      </section>

      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-3 text-sm font-semibold">Revenue by payment method</h3>
        {paymentParts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No payment data yet.</p>
        ) : (
          <SegmentBar parts={paymentParts} />
        )}
      </section>
    </div>
  );
}

/* --------------------------------- Sales -------------------------------- */

function SalesPanel({ months, ordersSeries }: { months: string[]; ordersSeries: number[] }) {
  const totalOrders = ordersSeries.reduce((s, n) => s + n, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <KPI label="Units sold" value={totalOrders.toLocaleString()} delta={0} />
        <KPI label="Total orders" value={totalOrders.toLocaleString()} delta={0} tone="success" />
      </div>
      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-4 text-sm font-semibold">Orders per month</h3>
        <BarChart labels={months} values={ordersSeries} formatter={(v) => v.toString()} />
      </section>
    </div>
  );
}

/* ------------------------------ Customers ------------------------------- */

function CustomersPanel({ totalCustomers }: { totalCustomers: number }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <KPI label="Total customers" value={totalCustomers.toLocaleString()} delta={0} />
        <KPI label="Registered users" value={totalCustomers.toLocaleString()} delta={0} tone="primary" />
      </div>
      <section className="surface-card rounded-3xl p-5">
        <p className="text-muted-foreground text-sm text-center py-4">
          Detailed customer segments will appear here as order data grows.
        </p>
      </section>
    </div>
  );
}

/* ------------------------------- Products ------------------------------- */

function ProductsPanel({ products, inventory }: { products: any[]; inventory: any[] }) {
  const lowStock = inventory.filter((r: any) => r.onHand > 0 && r.onHand < (r.reorderAt ?? 5)).length;
  const outOfStock = inventory.filter((r: any) => r.onHand === 0).length;

  // Top products by review count (best real signal without order join)
  const top = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.reviewCount ?? b.reviews ?? 0) - (a.reviewCount ?? a.reviews ?? 0))
      .slice(0, 6);
  }, [products]);
  const maxReviews = top[0]?.reviewCount ?? top[0]?.reviews ?? 1;

  const avgRating = products.length
    ? (products.reduce((s, p) => s + parseFloat(p.rating ?? "0"), 0) / products.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="Active SKUs" value={products.length.toString()} delta={0} />
        <KPI label="Low stock" value={lowStock.toString()} delta={0} tone="warn" />
        <KPI label="Out of stock" value={outOfStock.toString()} delta={0} tone="success" />
        <KPI label="Avg rating" value={avgRating} delta={0} tone="primary" />
      </div>
      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-4 text-sm font-semibold">Top products by reviews</h3>
        {top.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No products yet.</p>
        ) : (
          <ul className="space-y-3">
            {top.map((p) => (
              <li key={p.id} className="grid grid-cols-[1fr_120px_60px] items-center gap-3 text-sm">
                <span className="truncate font-medium">{p.name}</span>
                <div className="bg-surface-muted h-2 overflow-hidden rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${((p.reviewCount ?? p.reviews ?? 0) / maxReviews) * 100}%` }} />
                </div>
                <span className="text-right font-semibold tabular-nums">{p.reviewCount ?? p.reviews ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* -------------------------------- Orders -------------------------------- */

function OrdersPanel({ orders, ordersSeries, statusTotals }: { orders: any[]; ordersSeries: number[]; statusTotals: Record<string, number> }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="Orders (6m)" value={ordersSeries.reduce((s, n) => s + n, 0).toLocaleString()} delta={0} />
        <KPI label="Pending" value={(statusTotals["Placed"] ?? 0).toString()} delta={0} tone="warn" />
        <KPI label="Delivered" value={(statusTotals["Delivered"] ?? 0).toString()} delta={0} tone="success" />
        <KPI label="Cancelled" value={(statusTotals["Cancelled"] ?? 0).toString()} delta={0} />
      </div>
      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-3 text-sm font-semibold">Recent orders</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
            <tr>
              <th className="py-2">Order</th>
              <th>Status</th>
              <th>Courier</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map((o) => (
              <tr key={o.id} className="border-border border-t">
                <td className="py-2 font-medium">{o.id}</td>
                <td>
                  <StatusPill status={o.status} />
                </td>
                <td className="text-muted-foreground">{o.courier}</td>
                <td className="text-right font-semibold">{formatBDT(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* ------------------------------- Delivery ------------------------------- */

interface DeliveryStats {
  couriers: Record<string, { shipments: number; delivered: number; revenue: number }>;
  zones: { zone: string; count: number; pct: number }[];
  onTimePct: number;
  totalShipments: number;
}

function useDeliveryStats(): DeliveryStats | null {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  useEffect(() => {
    fetch(`${API_ORIGIN}/api/admin/delivery-stats`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) setStats(d); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return stats;
}

function DeliveryPanel() {
  const stats = useDeliveryStats();
  const totalShip = stats?.totalShipments ?? 0;

  const ZONE_COLORS: Record<string, string> = {
    inside_dhaka: "#3B82F6",
    sub_dhaka: "#8B5CF6",
    outside_dhaka: "#F59E0B",
    outside_bd: "#EF4444",
  };
  const ZONE_LABELS: Record<string, string> = {
    inside_dhaka: "Inside Dhaka",
    sub_dhaka: "Sub-Dhaka",
    outside_dhaka: "Outside Dhaka",
    outside_bd: "Outside BD",
  };

  const rows = PRIMARY_COURIERS.map((id) => {
    const c = COURIERS[id];
    const cs = stats?.couriers?.[id] ?? { shipments: 0, delivered: 0, revenue: 0 };
    const onTime = cs.shipments > 0 ? Math.round((cs.delivered / cs.shipments) * 100) : 0;
    return { c, shipments: cs.shipments, onTime, revenue: cs.revenue };
  });

  const zoneParts = (stats?.zones ?? []).map((z) => ({
    label: ZONE_LABELS[z.zone] ?? z.zone,
    value: z.pct,
    color: ZONE_COLORS[z.zone] ?? "#94A3B8",
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="Total shipments" value={totalShip.toLocaleString()} delta={0} tone="primary" />
        <KPI label="On-time rate" value={stats ? `${stats.onTimePct}%` : "—"} delta={0} tone="success" />
        <KPI label="Delivered" value={stats ? Object.values(stats.couriers).reduce((s, c) => s + c.delivered, 0).toString() : "—"} delta={0} />
        <KPI label="Zones tracked" value={stats ? (stats.zones?.length ?? 0).toString() : "—"} delta={0} tone="warn" />
      </div>

      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-4 text-sm font-semibold">Courier performance</h3>
        {totalShip === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No shipment data yet. Orders will appear here once placed.</p>
        ) : (
          <div className="space-y-3">
            {rows.filter((r) => r.shipments > 0).map((r) => (
              <div key={r.c.id} className="grid grid-cols-[140px_1fr_70px_90px] items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: r.c.accent }} />
                  <span className="font-medium">{r.c.name}</span>
                </div>
                <div className="bg-surface-muted h-2 overflow-hidden rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${(r.shipments / totalShip) * 100}%`, background: r.c.accent }} />
                </div>
                <span className="text-right tabular-nums">{r.shipments}</span>
                <span className="text-right text-emerald-700 tabular-nums">{r.onTime}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
          <PackageCheck className="size-4" /> Delivery revenue by zone
        </h3>
        {zoneParts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No zone data yet.</p>
        ) : (
          <SegmentBar parts={zoneParts} />
        )}
      </section>
    </div>
  );
}

/* ------------------------------- Primitives ----------------------------- */

function KPI({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: number;
  tone?: "success" | "warn" | "primary";
}) {
  const up = delta >= 0;
  return (
    <div className="surface-card rounded-3xl p-4">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
      <div
        className={cn(
          "text-display mt-1 text-2xl font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "success" && "text-emerald-700",
          tone === "warn" && "text-amber-700",
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold",
          up ? "text-emerald-700" : "text-rose-700",
        )}
      >
        {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
        {Math.abs(delta).toFixed(1)}% vs prev
      </div>
    </div>
  );
}

function BarChart({
  labels,
  values,
  formatter,
}: {
  labels: string[];
  values: number[];
  formatter: (v: number) => string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-48 items-end gap-3">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="bg-primary w-full rounded-t-xl transition-all"
            style={{ height: `${(v / max) * 100}%` }}
            title={formatter(v)}
          />
          <div className="text-muted-foreground text-[10px]">{labels[i]}</div>
          <div className="text-[10px] font-semibold tabular-nums">{formatter(v)}</div>
        </div>
      ))}
    </div>
  );
}

function SegmentBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-3 text-xs">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: p.color }} />
            <span className="font-medium">{p.label}</span>
            <span className="text-muted-foreground">{((p.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Delivered"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Cancelled"
        ? "bg-rose-100 text-rose-800"
        : status === "Out for delivery"
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone)}>{status}</span>;
}

/* ---------------------------- Notification templates --------------------------- */

const CHANNEL_TAB_ICON = {
  inApp: Bell,
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
} as const;

function NotificationsPanel() {
  const [ch, setCh] = useState<"inApp" | "email" | "sms" | "push">("email");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <KPI label="Templates" value={NOTIFICATION_TEMPLATES.length.toString()} delta={0} />
        <KPI label="Channels" value="4" delta={0} tone="primary" />
      </div>

      <section className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-display text-sm font-semibold">Notification templates</h3>
          <div className="bg-surface-muted flex gap-1 rounded-2xl p-1">
            {(["inApp", "email", "sms", "push"] as const).map((c) => {
              const Icon = CHANNEL_TAB_ICON[c];
              const map = { inApp: "in_app", email: "email", sms: "sms", push: "push" } as const;
              const active = ch === c;
              return (
                <button
                  key={c}
                  onClick={() => setCh(c)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium",
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" /> {NOTIFICATION_CHANNEL_LABEL[map[c]]}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {NOTIFICATION_TEMPLATES.map((t) => (
            <li key={t.event} className="border-border rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">
                  {NOTIFICATION_EVENT_LABEL[t.event]}
                </div>
                <code className="text-muted-foreground bg-surface-muted rounded-full px-2 py-0.5 text-[10px]">
                  {t.event}
                </code>
              </div>
              {ch === "email" && (
                <div className="text-muted-foreground mt-1 text-[11px]">
                  Subject: <span className="text-foreground font-medium">{t.subject}</span>
                </div>
              )}
              <pre className="bg-surface-muted text-foreground mt-2 whitespace-pre-wrap rounded-2xl p-3 text-xs">
                {t[ch]}
              </pre>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-3 text-[11px]">
          Placeholders like <code>{"{{orderId}}"}</code>, <code>{"{{name}}"}</code>,{" "}
          <code>{"{{total}}"}</code> are interpolated at send time.
        </p>
      </section>
    </div>
  );
}

/* ---------------------------- Review moderation --------------------------- */

function ReviewsPanel({ reviews, setReviews }: { reviews: any[]; setReviews: (fn: (r: any[]) => any[]) => void }) {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<"Pending" | "Published" | "Rejected" | "Reported">("Pending");

  const list = useMemo(() => {
    if (tab === "Reported") return reviews.filter((r) => (r.reports ?? 0) > 0);
    return reviews.filter((r) => r.status === tab);
  }, [reviews, tab]);

  function setStatus(id: string, status: string) {
    const token = getToken();
    const prevStatus = reviews.find((r) => r.id === id)?.status;
    setReviews((l) => l.map((r) => (r.id === id ? { ...r, status } : r)));
    fetch(`${API_ORIGIN}/api/admin/reviews/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
      })
      .catch(() => {
        if (prevStatus !== undefined) {
          setReviews((l) => l.map((r) => (r.id === id ? { ...r, status: prevStatus } : r)));
        }
      });
  }

  const counts = {
    Pending: reviews.filter((r) => r.status === "Pending").length,
    Published: reviews.filter((r) => r.status === "Published").length,
    Rejected: reviews.filter((r) => r.status === "Rejected").length,
    Reported: reviews.filter((r) => (r.reports ?? 0) > 0).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="Pending" value={counts.Pending.toString()} delta={0} tone="warn" />
        <KPI label="Published" value={counts.Published.toString()} delta={3.4} tone="success" />
        <KPI label="Rejected" value={counts.Rejected.toString()} delta={-1.0} />
        <KPI label="Reported" value={counts.Reported.toString()} delta={0} tone="warn" />
      </div>

      <section className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          {(["Pending", "Published", "Rejected", "Reported"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-2xl px-3 py-1.5 text-xs font-medium",
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-foreground",
              )}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-3">
          {list.length === 0 && (
            <li className="text-muted-foreground py-6 text-center text-sm">
              Nothing in this queue.
            </li>
          )}
          {list.map((r) => (
            <li key={r.id} className="border-border rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.productName}</div>
                  <div className="text-muted-foreground mt-0.5 text-[11px]">
                    {r.authorName} · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    {(r.reports ?? 0) > 0 && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-rose-600">
                        <Flag className="size-3" /> {r.reports} report{r.reports !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs">{r.body}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {r.status !== "Published" && (
                    <button
                      onClick={() => setStatus(r.id, "Published")}
                      className="text-emerald-600 hover:text-emerald-800"
                      title="Publish"
                    >
                      <CheckCircle2 className="size-5" />
                    </button>
                  )}
                  {r.status !== "Rejected" && (
                    <button
                      onClick={() => setStatus(r.id, "Rejected")}
                      className="text-rose-500 hover:text-rose-700"
                      title="Reject"
                    >
                      <XCircle className="size-5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
