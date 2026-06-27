import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Search, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { formatBDT, formatDay, type OrderStatus } from "@/data/account";
import { COURIERS } from "@/data/couriers";
import { useAuth } from "@/lib/authStore";
import { accountFetch } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/orders/")({
  component: OrdersList,
});

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
}

const STATUS_TONE: Record<OrderStatus, string> = {
  Placed: "bg-surface-muted text-foreground",
  Processing: "bg-amber/15 text-amber-foreground",
  Packed: "bg-amber/15 text-amber-foreground",
  Shipped: "bg-primary-soft text-primary",
  "Out for delivery": "bg-primary text-primary-foreground",
  Delivered: "bg-success/15 text-success",
  Cancelled: "bg-destructive/10 text-destructive",
  Returned: "bg-coral/10 text-coral",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "Delivered", label: "Delivered" },
  { id: "Cancelled", label: "Cancelled" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function OrdersList() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    accountFetch<{ orders: ApiOrder[] }>("/orders", getToken())
      .then((d) => {
        if (!cancelled) setOrders(Array.isArray(d.orders) ? d.orders : []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter === "active" && ["Delivered", "Cancelled", "Returned"].includes(o.status))
        return false;
      if (filter !== "all" && filter !== "active" && o.status !== filter) return false;
      if (
        q &&
        ![o.id, o.trackingNumber, o.courier]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
  }, [orders, filter, q]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
          <Package className="size-6" /> Orders
        </h1>
        <p className="text-muted-foreground text-xs">
          {loading
            ? "Loading…"
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"} in your history`}
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="bg-surface-muted inline-flex rounded-pill p-1 text-xs font-medium">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-pill px-3 py-1.5 transition",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search orders, tracking or courier"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <div className="surface-card text-muted-foreground rounded-3xl p-8 text-center text-sm">
          Couldn't load your orders. Please try again later.
        </div>
      )}

      {!error && !loading && orders.length === 0 && (
        <div className="surface-card text-muted-foreground rounded-3xl p-8 text-center text-sm">
          No orders yet — place your first order!
        </div>
      )}

      {!error && !loading && orders.length > 0 && filtered.length === 0 && (
        <div className="surface-card text-muted-foreground rounded-3xl p-8 text-center text-sm">
          No orders match your filters.
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map((o) => {
          const courier = COURIERS[o.courier as keyof typeof COURIERS];
          return (
            <li key={o.id}>
              <Link
                to="/account/orders/$id"
                params={{ id: o.id }}
                className="surface-card hover:shadow-card flex flex-col gap-3 rounded-3xl p-4 transition sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{o.id}</span>
                    <span
                      className={cn(
                        "rounded-pill px-2 py-0.5 text-[10px] font-medium",
                        STATUS_TONE[o.status] ?? "bg-surface-muted text-foreground",
                      )}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 truncate text-xs">
                    Placed {formatDay(o.placedAt)}
                  </div>
                  {courier && (
                    <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[11px]">
                      <span className="size-2 rounded-full" style={{ background: courier.accent }} />
                      <Truck className="size-3" /> {courier.name}
                      {o.trackingNumber ? ` • ${o.trackingNumber}` : ""}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-display text-base font-semibold">{formatBDT(o.total)}</div>
                  <div className="text-muted-foreground text-[11px]">{o.paymentMethod}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
