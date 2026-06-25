import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  PackageCheck,
  PackageX,
  Printer,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBDT, formatDay } from "@/data/account";
import { useAuth } from "@/lib/authStore";
import { API_ORIGIN } from "@/lib/accountApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Tab =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "returned"
  | "refunded";

const TABS: { id: Tab; label: string; icon: any; tone: string }[] = [
  { id: "pending", label: "Pending", icon: Clock, tone: "text-amber-700" },
  { id: "processing", label: "Processing", icon: ShoppingBag, tone: "text-blue-700" },
  { id: "shipped", label: "Shipped", icon: Truck, tone: "text-indigo-700" },
  { id: "delivered", label: "Delivered", icon: PackageCheck, tone: "text-emerald-700" },
  { id: "returned", label: "Returned", icon: RotateCcw, tone: "text-violet-700" },
  { id: "refunded", label: "Refunded", icon: Wallet, tone: "text-teal-700" },
];

function toAdminTab(status: string): Tab {
  if (status === "Placed") return "pending";
  if (status === "Processing" || status === "Packed") return "processing";
  if (status === "Shipped" || status === "Out for delivery") return "shipped";
  if (status === "Delivered") return "delivered";
  if (status === "Returned" || status === "Cancelled") return "returned";
  return "pending";
}

function useOrderData() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_ORIGIN}/api/admin/orders`, { headers }).then(r => r.json()),
      fetch(`${API_ORIGIN}/api/admin/refunds`, { headers }).then(r => r.json()),
    ]).then(([o, r]) => {
      if (Array.isArray(o)) setOrders(o.map(ord => ({ ...ord, adminStatus: toAdminTab(ord.status) })));
      if (Array.isArray(r)) setRefunds(r);
      setLoading(false);
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { orders, setOrders, refunds, loading };
}

function AdminOrders() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const { orders, setOrders, refunds, loading } = useOrderData();

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      pending: 0, processing: 0, shipped: 0, delivered: 0, returned: 0, refunded: 0,
    };
    for (const o of orders) c[o.adminStatus as Tab] = (c[o.adminStatus as Tab] ?? 0) + 1;
    c.refunded = refunds.length;
    return c;
  }, [orders, refunds]);

  const filtered = useMemo(() => {
    if (tab === "refunded") {
      return refunds.filter(
        (r) => !q || r.id.toLowerCase().includes(q.toLowerCase()) || r.orderId.toLowerCase().includes(q.toLowerCase()),
      );
    }
    return orders
      .filter((o) => o.adminStatus === tab)
      .filter((o) => !q || o.id.toLowerCase().includes(q.toLowerCase()) || (o.customerName ?? "").toLowerCase().includes(q.toLowerCase()));
  }, [orders, refunds, tab, q]);

  const totalRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);

  function advanceStatus(orderId: string) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const nextMap: Record<string, string> = {
      Placed: "Processing",
      Processing: "Packed",
      Packed: "Shipped",
      Shipped: "Out for delivery",
      "Out for delivery": "Delivered",
    };
    const next = nextMap[order.status];
    if (!next) return;
    const token = getToken();
    fetch(`${API_ORIGIN}/api/admin/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: next }),
    }).then((r) => {
      if (!r.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next, adminStatus: toAdminTab(next) } : o));
    }).catch(() => {
      toast.error("Couldn't update order status");
    });
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
              <ShoppingBag className="size-7" /> Order Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Triage every order from placement to refund.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1">
            <Printer className="size-4" /> Print manifest
          </Button>
        </header>

        <section className="mb-4 grid gap-3 sm:grid-cols-4">
          <KPI label="Total orders" value={orders.length.toString()} />
          <KPI label="Open pipeline" value={(counts.pending + counts.processing + counts.shipped).toString()} tone="primary" />
          <KPI label="Refund cases" value={counts.refunded.toString()} tone="warn" />
          <KPI label="Gross revenue" value={formatBDT(totalRevenue)} tone="success" />
        </section>

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
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active ? "bg-primary-foreground/20" : "bg-surface-muted",
                  )}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="surface-card mb-4 flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "refunded" ? "Search refund or order ID" : "Search order ID or customer"}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="surface-card rounded-3xl p-12 text-center">
            <p className="text-muted-foreground text-sm">Loading orders…</p>
          </div>
        ) : tab === "refunded" ? (
          <RefundTable rows={filtered} />
        ) : (
          <OrderTable
            rows={filtered}
            tab={tab}
            onAction={advanceStatus}
            onTrack={(o) =>
              toast.info(`Tracking — ${o.id}`, {
                description: `Courier: ${o.courier || "—"}${o.trackingNumber ? ` · Tracking #: ${o.trackingNumber}` : ""}`,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function OrderTable({
  rows, tab, onAction, onTrack,
}: {
  rows: any[];
  tab: Tab;
  onAction: (id: string) => void;
  onTrack: (order: any) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="surface-card rounded-3xl p-12 text-center">
        <PackageX className="text-muted-foreground mx-auto mb-2 size-8" />
        <p className="text-muted-foreground text-sm">No orders in this stage.</p>
      </div>
    );
  }
  return (
    <section className="surface-card overflow-x-auto rounded-3xl p-2">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2">Order</th>
            <th className="py-2">Customer</th>
            <th className="py-2">Items</th>
            <th className="py-2">Courier</th>
            <th className="py-2">Placed</th>
            <th className="py-2 text-right">Total</th>
            <th className="py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-border border-t">
              <td className="px-3 py-3 font-medium">{o.id}</td>
              <td className="py-3">
                <div className="font-medium">{o.customerName ?? o.shipTo?.name ?? "—"}</div>
                <div className="text-muted-foreground text-[11px]">{o.shipToArea ?? o.shipTo?.area ?? ""}</div>
              </td>
              <td className="text-muted-foreground py-3 text-xs">{(o.items?.length ?? 0)} item(s)</td>
              <td className="text-muted-foreground py-3">{o.courier}</td>
              <td className="text-muted-foreground py-3 text-xs">{formatDay(o.placedAt)}</td>
              <td className="py-3 text-right font-semibold">{formatBDT(o.total)}</td>
              <td className="py-3 text-right">
                {tab === "shipped" ? (
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => onTrack(o)}>
                      Track
                    </Button>
                    <Button size="sm" variant="soft" className="gap-1" onClick={() => onAction(o.id)}>
                      Out for delivery
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction(o.id)}>
                    {tab === "pending" && "Accept"}
                    {tab === "processing" && "Mark packed"}
                    {tab === "delivered" && (<><CheckCircle2 className="size-3.5" /> Done</>)}
                    {tab === "returned" && "Process return"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RefundTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <div className="surface-card rounded-3xl p-12 text-center">
        <PackageX className="text-muted-foreground mx-auto mb-2 size-8" />
        <p className="text-muted-foreground text-sm">No refund cases.</p>
      </div>
    );
  }
  return (
    <section className="surface-card overflow-x-auto rounded-3xl p-2">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2">Refund</th>
            <th className="py-2">Order</th>
            <th className="py-2">Product</th>
            <th className="py-2">Reason</th>
            <th className="py-2">Method</th>
            <th className="py-2 text-right">Amount</th>
            <th className="py-2 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-border border-t">
              <td className="px-3 py-3 font-medium">{r.id}</td>
              <td className="text-muted-foreground py-3">{r.orderId}</td>
              <td className="py-3">{r.productName}</td>
              <td className="text-muted-foreground py-3 text-xs">{r.reason}</td>
              <td className="text-muted-foreground py-3 text-xs">{r.method}</td>
              <td className="py-3 text-right font-semibold">{formatBDT(r.amount)}</td>
              <td className="py-3 text-right">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    r.status === "Completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : r.status === "Rejected"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800",
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
  );
}

function KPI({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "warn" | "success";
}) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
      <div
        className={cn(
          "text-display mt-1 text-2xl font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "warn" && "text-amber-700",
          tone === "success" && "text-emerald-700",
        )}
      >
        {value}
      </div>
    </div>
  );
}
