import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  MapPin,
  Package,
  Phone,
  Printer,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatBDT, formatDate, type OrderStatus } from "@/data/account";
import { COURIERS, type CourierId } from "@/data/couriers";
import { useAuth } from "@/lib/authStore";
import { accountFetch } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/orders/$id")({
  component: OrderDetail,
});

interface ApiOrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface ApiOrder {
  id: string;
  status: OrderStatus;
  total: number;
  deliveryCharge: number;
  paymentMethod: string;
  courier: string;
  trackingNumber?: string;
  placedAt: string;
  updatedAt: string;
  shipTo: { line1: string; area: string; city: string; phone: string };
  items: ApiOrderItem[];
}

const TIMELINE_STEPS: { label: string; statuses: OrderStatus[] }[] = [
  {
    label: "Placed",
    statuses: ["Placed", "Processing", "Packed", "Shipped", "Out for delivery", "Delivered"],
  },
  {
    label: "Processing",
    statuses: ["Processing", "Packed", "Shipped", "Out for delivery", "Delivered"],
  },
  { label: "Shipped", statuses: ["Shipped", "Out for delivery", "Delivered"] },
  { label: "Delivered", statuses: ["Delivered"] },
];

function deriveTimeline(order: ApiOrder) {
  return TIMELINE_STEPS.map((step) => ({
    status: step.label,
    done: step.statuses.includes(order.status),
    at: step.label === "Placed" ? order.placedAt : step.statuses.includes(order.status) ? order.updatedAt : null,
  }));
}

function OrderDetail() {
  const { id } = useParams({ from: "/account/orders/$id" });
  const { getToken } = useAuth();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      setError(null);
      try {
        const data = await accountFetch<{ order: ApiOrder }>(`/orders/${id}`, getToken());
        setOrder(data.order);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load this order");
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [id, getToken],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="surface-card text-muted-foreground rounded-3xl p-8 text-center text-sm">
        Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="surface-card rounded-3xl p-8 text-center">
        <h2 className="text-display text-lg font-semibold">Order not found</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {error ?? "We couldn't find that order in your history."}
        </p>
        <Button variant="hero" className="mt-4" asChild>
          <Link to="/account/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const courier = COURIERS[order.courier as CourierId] ?? COURIERS.Pathao;
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = order.deliveryCharge ?? Math.max(0, order.total - subtotal);
  const timeline = deriveTimeline(order);
  const completed = timeline.filter((e) => e.done).length;
  const progress = Math.round((completed / timeline.length) * 100);

  function copyTracking() {
    if (!order!.trackingNumber) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(order!.trackingNumber)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => toast.error("Couldn't copy tracking number"));
    }
  }

  async function refreshTracking() {
    setRefreshing(true);
    try {
      await load({ silent: true });
      setRefreshedAt(new Date().toISOString());
      toast.success("Order status refreshed");
    } catch {
      toast.error("Couldn't refresh order status");
    } finally {
      setRefreshing(false);
    }
  }

  function downloadInvoice() {
    const lines = [
      `DADAR SHOP — INVOICE`,
      ``,
      `Order:        ${order!.id}`,
      `Placed:       ${formatDate(order!.placedAt)}`,
      `Payment:      ${order!.paymentMethod}`,
      `Courier:      ${courier.name}${order!.trackingNumber ? ` (${order!.trackingNumber})` : ""}`,
      ``,
      `Ship to:`,
      `  ${order!.shipTo.line1}`,
      `  ${order!.shipTo.area}, ${order!.shipTo.city}`,
      `  ${order!.shipTo.phone}`,
      ``,
      `Items:`,
      ...order!.items.map((i) => `  ${i.qty} × ${i.name.padEnd(36)} ${formatBDT(i.price * i.qty)}`),
      ``,
      `Subtotal:     ${formatBDT(subtotal)}`,
      `Shipping:     ${formatBDT(shipping)}`,
      `TOTAL:        ${formatBDT(order!.total)}`,
      ``,
      `Thank you for shopping with Dadar Shop.`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${order!.id}-invoice.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <header className="surface-card flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display text-2xl font-semibold">{order.id}</h1>
          <p className="text-muted-foreground text-xs">
            Placed {formatDate(order.placedAt)} • {order.paymentMethod}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadInvoice}>
            <Download className="size-4" /> Invoice
          </Button>
        </div>
      </header>

      {/* Tracking summary */}
      <section className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
              Shipment status
            </div>
            <div className="text-display text-lg font-semibold">{order.status}</div>
          </div>
          <div
            className="rounded-2xl px-3 py-2 text-right"
            style={{ background: `${courier.accent}14` }}
          >
            <div className="text-muted-foreground flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide">
              <Truck className="size-3" /> Courier
            </div>
            <div className="text-sm font-semibold" style={{ color: courier.accent }}>
              {courier.name}
            </div>
            {order.trackingNumber && (
              <button
                type="button"
                onClick={copyTracking}
                className="text-primary mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium"
              >
                {order.trackingNumber} {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="bg-surface-muted mt-4 h-2 overflow-hidden rounded-full">
          <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-muted-foreground mt-1 text-[11px]">
          {completed} of {timeline.length} steps complete
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={refreshTracking} disabled={refreshing}>
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />{" "}
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button size="sm" variant="outline" disabled>
            <Printer className="size-3.5" /> Shipping label
          </Button>
          {courier.hotline && (
            <a
              href={`tel:${courier.hotline}`}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-center text-xs"
            >
              <Phone className="size-3" /> Hotline {courier.hotline}
            </a>
          )}
        </div>
        {refreshedAt && (
          <div className="text-muted-foreground mt-2 text-[11px]">
            Last refreshed {formatDate(refreshedAt)}.
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="surface-card rounded-3xl p-5">
        <h2 className="text-display mb-4 flex items-center gap-2 text-sm font-semibold">
          <Package className="size-4" /> Delivery timeline
        </h2>
        <ol className="relative ml-3 space-y-5 border-l">
          {timeline.map((e, i) => (
            <li key={i} className="ml-4">
              <span
                className={cn(
                  "absolute -left-[9px] flex size-4 items-center justify-center rounded-full ring-4",
                  e.done
                    ? "bg-primary text-primary-foreground ring-background"
                    : "bg-surface-muted ring-background",
                )}
              >
                {e.done && <Check className="size-2.5" />}
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <div className={cn("text-sm font-medium", !e.done && "text-muted-foreground")}>
                  {e.status}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {e.at ? formatDate(e.at) : "Pending"}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Items */}
      <section className="surface-card rounded-3xl p-5">
        <h2 className="text-display mb-3 text-sm font-semibold">Items</h2>
        <ul className="divide-border divide-y">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium">{i.name}</div>
                <div className="text-muted-foreground text-xs">Qty {i.qty}</div>
              </div>
              <div className="text-sm font-semibold">{formatBDT(i.price * i.qty)}</div>
            </li>
          ))}
        </ul>
        <div className="border-border mt-3 space-y-1 border-t pt-3 text-sm">
          <Row label="Subtotal" value={formatBDT(subtotal)} />
          <Row label={`Shipping (${courier.name})`} value={formatBDT(shipping)} />
          <Row label="Total" value={formatBDT(order.total)} bold />
        </div>
      </section>

      {/* Ship to */}
      <section className="surface-card rounded-3xl p-5">
        <h2 className="text-display mb-2 flex items-center gap-2 text-sm font-semibold">
          <MapPin className="size-4" /> Shipping address
        </h2>
        <div className="text-sm leading-relaxed">
          <div className="text-muted-foreground">
            {order.shipTo.line1}
            <br />
            {order.shipTo.area}, {order.shipTo.city}
            <br />
            {order.shipTo.phone}
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-muted-foreground", bold && "text-foreground font-semibold")}>
        {label}
      </span>
      <span className={cn(bold && "text-display text-base font-semibold")}>{value}</span>
    </div>
  );
}
