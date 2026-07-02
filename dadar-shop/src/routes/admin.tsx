import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/authStore";
import { API_ORIGIN } from "@/lib/accountApi";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  PackageCheck,
  ShoppingBag,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { COURIERS, PRIMARY_COURIERS } from "@/data/couriers";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

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

interface DeliveryStats {
  couriers: Record<string, { shipments: number; delivered: number; revenue: number }>;
  zones: { zone: string; count: number; pct: number }[];
  onTimePct: number;
  totalShipments: number;
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
  const [loading, setLoading] = useState(true);

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
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading };
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

function AdminDashboard() {
  const { data: dash, loading } = useAdminDashboard();
  const delivery = useDeliveryStats();

  const total = dash.revenueSeries.reduce((s, n) => s + n, 0);
  const last = dash.revenueSeries[dash.revenueSeries.length - 1] ?? 0;
  const prev = dash.revenueSeries[dash.revenueSeries.length - 2] ?? last;
  const growth = prev === 0 ? 0 : ((last - prev) / prev) * 100;
  const totalOrders = dash.ordersSeries.reduce((s, n) => s + n, 0);
  const lastOrders = dash.ordersSeries[dash.ordersSeries.length - 1] ?? 1;
  const prevOrders = dash.ordersSeries[dash.ordersSeries.length - 2] ?? lastOrders;
  const orderGrowth = prevOrders === 0 ? 0 : ((lastOrders - prevOrders) / prevOrders) * 100;

  const PAYMENT_COLORS: Record<string, string> = { bKash: "#E2136E", Nagad: "#EB6E1F", Card: "#1A1F71", COD: "#0F766E", Rocket: "#8C2D8D" };
  const pmTotals: Record<string, number> = {};
  for (const o of dash.orders) {
    if (o.paymentMethod) pmTotals[o.paymentMethod] = (pmTotals[o.paymentMethod] ?? 0) + (o.total ?? 0);
  }
  const pmGrand = Object.values(pmTotals).reduce((a, b) => a + b, 0) || 1;
  const paymentParts = Object.entries(pmTotals).map(([method, amt]) => ({
    label: method,
    value: Math.round((amt / pmGrand) * 100),
    color: PAYMENT_COLORS[method] ?? "#94A3B8",
  }));

  const STATUS_COLORS: Record<string, string> = {
    Placed: "#F59E0B", Processing: "#3B82F6", "Out for delivery": "#8B5CF6",
    Delivered: "#10B981", Cancelled: "#EF4444", Returned: "#F97316",
  };
  const statusGrand = Object.values(dash.statusTotals).reduce((a, b) => a + b, 0) || 1;
  const statusParts = Object.entries(dash.statusTotals)
    .filter(([, v]) => v > 0)
    .map(([status, v]) => ({ label: status, value: Math.round((v / statusGrand) * 100), color: STATUS_COLORS[status] ?? "#94A3B8" }));

  const ZONE_COLORS: Record<string, string> = {
    inside_dhaka: "#3B82F6", sub_dhaka: "#8B5CF6", outside_dhaka: "#F59E0B", outside_bd: "#EF4444",
  };
  const ZONE_LABELS: Record<string, string> = {
    inside_dhaka: "Inside Dhaka", sub_dhaka: "Sub-Dhaka", outside_dhaka: "Outside Dhaka", outside_bd: "Outside BD",
  };
  const zoneParts = (delivery?.zones ?? []).map((z) => ({
    label: ZONE_LABELS[z.zone] ?? z.zone,
    value: z.pct,
    color: ZONE_COLORS[z.zone] ?? "#94A3B8",
  }));

  const courierRows = PRIMARY_COURIERS.map((id) => {
    const c = COURIERS[id];
    const cs = delivery?.couriers?.[id] ?? { shipments: 0, delivered: 0, revenue: 0 };
    const onTime = cs.shipments > 0 ? Math.round((cs.delivered / cs.shipments) * 100) : 0;
    return { c, shipments: cs.shipments, onTime };
  });
  const totalShip = delivery?.totalShipments ?? 0;

  const lowStock = dash.inventory.filter((r: any) => r.onHand > 0 && r.onHand < (r.reorderAt ?? 5)).length;
  const outOfStock = dash.inventory.filter((r: any) => r.onHand === 0).length;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 flex flex-col gap-3 rounded-3xl p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live overview across revenue, orders, customers and delivery.
          </p>
        </div>
        <Button variant="hero" size="sm" asChild>
          <Link to="/seller">Seller portal</Link>
        </Button>
      </header>

      {loading ? (
        <div className="surface-card rounded-3xl p-10 text-center text-sm text-muted-foreground">Loading dashboard…</div>
      ) : (
        <div className="space-y-4">
          {/* KPI row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPI icon={DollarSign} label="Revenue (6m)" value={formatBDT(total)} delta={growth} tone="primary" />
            <KPI icon={ShoppingBag} label="Orders (6m)" value={totalOrders.toLocaleString()} delta={orderGrowth} tone="success" />
            <KPI icon={Users} label="Total customers" value={dash.totalCustomers.toLocaleString()} delta={0} />
            <KPI icon={PackageCheck} label="Avg order value" value={formatBDT(Math.round(last / Math.max(lastOrders, 1)))} delta={0} tone="warn" />
          </div>

          {/* Revenue + orders trend */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface-card rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-display text-sm font-semibold">Revenue trend</h3>
                <span className="text-muted-foreground text-xs">Monthly · BDT</span>
              </div>
              {dash.months.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">No revenue data yet.</p>
              ) : (
                <BarChart labels={dash.months} values={dash.revenueSeries} formatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
              )}
            </section>

            <section className="surface-card rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-display text-sm font-semibold">Orders trend</h3>
                <span className="text-muted-foreground text-xs">Monthly · count</span>
              </div>
              {dash.months.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">No order data yet.</p>
              ) : (
                <BarChart labels={dash.months} values={dash.ordersSeries} formatter={(v) => v.toString()} />
              )}
            </section>
          </div>

          {/* Breakdown charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="surface-card rounded-3xl p-5">
              <h3 className="text-display mb-3 text-sm font-semibold">Revenue by payment method</h3>
              {paymentParts.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">No payment data yet.</p>
              ) : (
                <SegmentBar parts={paymentParts} />
              )}
            </section>

            <section className="surface-card rounded-3xl p-5">
              <h3 className="text-display mb-3 text-sm font-semibold">Orders by status</h3>
              {statusParts.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">No order data yet.</p>
              ) : (
                <SegmentBar parts={statusParts} />
              )}
            </section>

            <section className="surface-card rounded-3xl p-5">
              <h3 className="text-display mb-3 text-sm font-semibold">Delivery by zone</h3>
              {zoneParts.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">No shipment data yet.</p>
              ) : (
                <SegmentBar parts={zoneParts} />
              )}
            </section>
          </div>

          {/* Inventory + courier snapshot */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface-card rounded-3xl p-5">
              <h3 className="text-display mb-4 text-sm font-semibold">Inventory health</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-muted rounded-2xl p-3 text-center">
                  <div className="text-2xl font-semibold tabular-nums">{dash.allProducts.length}</div>
                  <div className="text-muted-foreground mt-0.5 text-[10px] uppercase tracking-wider">Active SKUs</div>
                </div>
                <div className="bg-surface-muted rounded-2xl p-3 text-center">
                  <div className="text-2xl font-semibold tabular-nums text-amber-700">{lowStock}</div>
                  <div className="text-muted-foreground mt-0.5 text-[10px] uppercase tracking-wider">Low stock</div>
                </div>
                <div className="bg-surface-muted rounded-2xl p-3 text-center">
                  <div className="text-2xl font-semibold tabular-nums text-rose-700">{outOfStock}</div>
                  <div className="text-muted-foreground mt-0.5 text-[10px] uppercase tracking-wider">Out of stock</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link to="/admin/products">View all products</Link>
              </Button>
            </section>

            <section className="surface-card rounded-3xl p-5">
              <h3 className="text-display mb-4 text-sm font-semibold">Courier performance</h3>
              {totalShip === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">No shipment data yet.</p>
              ) : (
                <div className="space-y-3">
                  {courierRows.filter((r) => r.shipments > 0).map((r) => (
                    <div key={r.c.id} className="grid grid-cols-[110px_1fr_50px_60px] items-center gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: r.c.accent }} />
                        <span className="truncate font-medium">{r.c.name}</span>
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
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link to="/admin/shipping-zones">Manage shipping zones</Link>
              </Button>
            </section>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ------------------------------- Primitives ----------------------------- */

function KPI({
  icon: Icon,
  label,
  value,
  delta,
  tone,
}: {
  icon?: any;
  label: string;
  value: string;
  delta: number;
  tone?: "success" | "warn" | "primary";
}) {
  const up = delta >= 0;
  return (
    <div className="surface-card rounded-3xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
      </div>
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
      {delta !== 0 && (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold",
            up ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(delta).toFixed(1)}% vs prev
        </div>
      )}
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
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
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
