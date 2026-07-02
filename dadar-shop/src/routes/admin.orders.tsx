import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  PackageCheck,
  PackageX,
  Phone,
  Printer,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
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

type Tab = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned" | "refunded";

const TABS: { id: Tab; label: string; icon: any; tone: string }[] = [
  { id: "pending", label: "Pending", icon: Clock, tone: "text-amber-700" },
  { id: "processing", label: "Processing", icon: ShoppingBag, tone: "text-blue-700" },
  { id: "shipped", label: "Shipped", icon: Truck, tone: "text-indigo-700" },
  { id: "delivered", label: "Delivered", icon: PackageCheck, tone: "text-emerald-700" },
  { id: "cancelled", label: "Cancelled", icon: XCircle, tone: "text-rose-700" },
  { id: "returned", label: "Returned", icon: RotateCcw, tone: "text-violet-700" },
  { id: "refunded", label: "Refunded", icon: Wallet, tone: "text-teal-700" },
];

function toAdminTab(status: string): Tab {
  if (status === "Placed") return "pending";
  if (status === "Processing" || status === "Packed") return "processing";
  if (status === "Shipped" || status === "Out for delivery") return "shipped";
  if (status === "Delivered") return "delivered";
  if (status === "Cancelled") return "cancelled";
  if (status === "Returned") return "returned";
  return "pending";
}

function useOrderData() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_ORIGIN}/api/admin/orders`, { headers }).then((r) => r.json()),
      fetch(`${API_ORIGIN}/api/admin/refunds`, { headers }).then((r) => r.json()),
    ])
      .then(([o, r]) => {
        if (Array.isArray(o)) setOrders(o.map((ord) => ({ ...ord, adminStatus: toAdminTab(ord.status) })));
        if (Array.isArray(r)) setRefunds(r);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { orders, setOrders, refunds, loading, reload };
}

function AdminOrders() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const { orders, setOrders, refunds, loading, reload } = useOrderData();
  const [detailOrder, setDetailOrder] = useState<any | null>(null);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0, refunded: 0,
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

  const totalRevenue = orders.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + (o.total ?? 0), 0);

  function setOrderStatus(orderId: string, nextStatus: string) {
    const prev = orders;
    setOrders((list) =>
      list.map((o) => (o.id === orderId ? { ...o, status: nextStatus, adminStatus: toAdminTab(nextStatus) } : o)),
    );
    const token = getToken();
    fetch(`${API_ORIGIN}/api/admin/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: nextStatus }),
    })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => {
        setOrders(prev);
        toast.error("Couldn't update order status");
      });
  }

  function advanceStatus(orderId: string) {
    const order = orders.find((o) => o.id === orderId);
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
    setOrderStatus(orderId, next);
  }

  function cancelOrder(orderId: string) {
    if (!window.confirm("Cancel this order? The customer will be notified.")) return;
    setOrderStatus(orderId, "Cancelled");
    toast.success("Order cancelled");
  }

  function confirmOrder(orderId: string) {
    setOrderStatus(orderId, "Processing");
    toast.success("Order confirmed");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 flex flex-col gap-3 rounded-3xl p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
            <ShoppingBag className="size-7" /> Order Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Confirm, process, ship, deliver or cancel every customer order.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
          <Printer className="size-4" /> Print manifest
        </Button>
      </header>

      <section className="mb-4 grid gap-3 sm:grid-cols-4">
        <KPI label="Total orders" value={orders.length.toString()} />
        <KPI label="Open pipeline" value={(counts.pending + counts.processing + counts.shipped).toString()} tone="primary" />
        <KPI label="Cancelled" value={counts.cancelled.toString()} tone="warn" />
        <KPI label="Revenue (active)" value={formatBDT(totalRevenue)} tone="success" />
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
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-surface-muted",
              )}
            >
              <Icon className="size-4" /> {t.label}
              <span className={cn("ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", active ? "bg-primary-foreground/20" : "bg-surface-muted")}>
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
            placeholder={tab === "refunded" ? "Search refund or order ID" : "Search order ID or customer name"}
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
          onAdvance={advanceStatus}
          onConfirm={confirmOrder}
          onCancel={cancelOrder}
          onDetail={setDetailOrder}
        />
      )}

      {detailOrder && (
        <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
      )}
    </AdminLayout>
  );
}

function OrderTable({
  rows, tab, onAdvance, onConfirm, onCancel, onDetail,
}: {
  rows: any[];
  tab: Tab;
  onAdvance: (id: string) => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onDetail: (order: any) => void;
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
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2">Order ID</th>
            <th className="py-2">Customer</th>
            <th className="py-2">Items</th>
            <th className="py-2">Payment</th>
            <th className="py-2">Courier</th>
            <th className="py-2">Placed</th>
            <th className="py-2 text-right">Total</th>
            <th className="py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-border border-t hover:bg-surface-muted/30">
              <td className="px-3 py-3">
                <button className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => onDetail(o)}>
                  {o.id}
                </button>
              </td>
              <td className="py-3">
                <div className="font-medium">{o.customerName ?? "—"}</div>
                <div className="text-muted-foreground text-[11px]">{o.customerEmail ?? ""}</div>
                <div className="text-muted-foreground text-[11px]">{o.shipToArea ?? ""}{o.shipToCity ? `, ${o.shipToCity}` : ""}</div>
              </td>
              <td className="text-muted-foreground py-3 text-xs">{(o.items?.length ?? 0)} item{o.items?.length !== 1 ? "s" : ""}</td>
              <td className="py-3 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{o.paymentMethod}</span>
              </td>
              <td className="text-muted-foreground py-3">{o.courier ?? "—"}</td>
              <td className="text-muted-foreground py-3 text-xs">{formatDay(o.placedAt)}</td>
              <td className="py-3 text-right font-semibold">{formatBDT(o.total)}</td>
              <td className="py-3 text-right">
                <div className="flex justify-end gap-1.5 flex-wrap">
                  {tab === "pending" && (
                    <>
                      <Button size="sm" variant="hero" className="gap-1" onClick={() => onConfirm(o.id)}>
                        <CheckCircle2 className="size-3.5" /> Confirm
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-rose-600 hover:bg-rose-50" onClick={() => onCancel(o.id)}>
                        <XCircle className="size-3.5" /> Cancel
                      </Button>
                    </>
                  )}
                  {tab === "processing" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => onAdvance(o.id)}>
                        Mark packed
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-rose-600 hover:bg-rose-50" onClick={() => onCancel(o.id)}>
                        <XCircle className="size-3.5" /> Cancel
                      </Button>
                    </>
                  )}
                  {tab === "shipped" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => onAdvance(o.id)}>
                      <Truck className="size-3.5" /> Out for delivery
                    </Button>
                  )}
                  {tab === "delivered" && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                      <CheckCircle2 className="size-3.5" /> Delivered
                    </span>
                  )}
                  {tab === "cancelled" && (
                    <span className="inline-flex items-center gap-1 text-rose-700 text-xs font-semibold">
                      <XCircle className="size-3.5" /> Cancelled
                    </span>
                  )}
                  {tab === "returned" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => onAdvance(o.id)}>
                      Process return
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => onDetail(o)}>
                    Details
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function OrderDetailModal({ order, onClose }: { order: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-background max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-display text-lg font-semibold">Order {order.id}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-muted rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-semibold">{order.customerName ?? "—"}</div>
            {order.customerEmail && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Mail className="size-3" /> {order.customerEmail}
              </div>
            )}
            {order.shipToPhone && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Phone className="size-3" /> {order.shipToPhone}
              </div>
            )}
            {(order.shipToLine1 || order.shipToArea) && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <MapPin className="size-3" />
                {[order.shipToLine1, order.shipToArea, order.shipToCity].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-display mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items ordered</h3>
            <ul className="space-y-2">
              {(order.items ?? []).length === 0 ? (
                <li className="text-muted-foreground text-sm">No item details available.</li>
              ) : (
                (order.items ?? []).map((item: any) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-muted-foreground text-[11px]">Qty: {item.qty}</div>
                    </div>
                    <span className="font-semibold tabular-nums">{formatBDT(item.price * item.qty)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3">
            <div className="text-sm">
              <div className="text-muted-foreground text-xs">Payment method</div>
              <div className="font-semibold">{order.paymentMethod}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">Order total</div>
              <div className="text-lg font-bold tabular-nums">{formatBDT(order.total)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Status: <span className="font-semibold text-foreground">{order.status}</span></span>
            <span>Courier: {order.courier ?? "—"}</span>
            <span>Placed: {formatDay(order.placedAt)}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
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
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  r.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                  r.status === "Rejected" ? "bg-rose-100 text-rose-800" :
                  "bg-amber-100 text-amber-800")}>
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

function KPI({ label, value, tone }: { label: string; value: string; tone?: "primary" | "warn" | "success" }) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
      <div className={cn("text-display mt-1 text-2xl font-semibold tabular-nums",
        tone === "primary" && "text-primary",
        tone === "warn" && "text-amber-700",
        tone === "success" && "text-emerald-700")}>
        {value}
      </div>
    </div>
  );
}
