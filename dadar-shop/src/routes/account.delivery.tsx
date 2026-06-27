import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator,
  ExternalLink,
  Printer,
  Truck,
  Search,
  Phone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBDT, type Order } from "@/data/account";
import {
  COURIERS,
  PRIMARY_COURIERS,
  ZONE_LABEL,
  calcDeliveryCharge,
  type CourierId,
  type DeliveryZone,
} from "@/data/couriers";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/authStore";
import { accountFetch } from "@/lib/accountApi";

function useOrders() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    accountFetch<{ orders: Order[] }>("/orders", getToken())
      .then((d) => { if (!cancelled) setOrders(Array.isArray(d.orders) ? d.orders : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { orders, loading };
}

export const Route = createFileRoute("/account/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery Management — Dadar Shop" },
      {
        name: "description",
        content:
          "Courier dashboard for Pathao, RedX, SteadFast, Paperfly and Sundarban. Track shipments, calculate charges and print shipping labels.",
      },
    ],
  }),
  component: DeliveryHub,
});

function DeliveryHub() {
  const [tab, setTab] = useState<"dashboard" | "calculator" | "labels">("dashboard");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
          <Truck className="size-6" /> Delivery Management
        </h1>
        <p className="text-muted-foreground text-xs">
          Pathao · RedX · SteadFast · Paperfly · Sundarban
        </p>
      </header>

      <div className="bg-surface-muted inline-flex rounded-pill p-1 text-xs font-medium">
        {(
          [
            { id: "dashboard", label: "Courier dashboard" },
            { id: "calculator", label: "Delivery charge" },
            { id: "labels", label: "Shipping labels" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-pill px-3 py-1.5 transition",
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <CourierDashboard />}
      {tab === "calculator" && <ChargeCalculator />}
      {tab === "labels" && <LabelsPanel />}
    </div>
  );
}

function CourierDashboard() {
  const { orders, loading } = useOrders();

  const stats = useMemo(() => {
    return PRIMARY_COURIERS.map((id) => {
      const list = orders.filter((o) => o.courier === id);
      const inTransit = list.filter((o) =>
        ["Shipped", "Out for delivery", "Processing", "Packed"].includes(o.status),
      ).length;
      const delivered = list.filter((o) => o.status === "Delivered").length;
      const revenue = list.reduce((s, o) => s + (o.deliveryCharge ?? 0), 0);
      return { id, total: list.length, inTransit, delivered, revenue };
    });
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const c = COURIERS[s.id];
          return (
            <div key={s.id} className="surface-card rounded-3xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ background: c.accent }}
                    />
                    <h3 className="text-display text-sm font-semibold">{c.name}</h3>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    ETA {c.etaDays[0]}–{c.etaDays[1]} days
                  </p>
                </div>
                <a
                  href={`tel:${c.hotline}`}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
                >
                  <Phone className="size-3" /> {c.hotline}
                </a>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini label="Orders" value={s.total} />
                <Mini label="In transit" value={s.inTransit} />
                <Mini label="Delivered" value={s.delivered} />
              </div>
              <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
                <span>Shipping revenue</span>
                <span className="text-foreground font-semibold">
                  {formatBDT(s.revenue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <section className="surface-card rounded-3xl p-5">
        <h2 className="text-display mb-3 text-sm font-semibold">Active shipments</h2>
        <ShipmentTable orders={orders} />
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-muted rounded-2xl py-2">
      <div className="text-display text-base font-semibold">{value}</div>
      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function ShipmentTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead className="text-muted-foreground uppercase tracking-wide">
          <tr>
            <th className="py-2 pr-3">Order</th>
            <th className="py-2 pr-3">Courier</th>
            <th className="py-2 pr-3">Tracking</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3 text-right">Charge</th>
            <th className="py-2 pr-3"></th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {orders.map((o) => {
            const c = COURIERS[o.courier];
            return (
              <tr key={o.id} className="align-top">
                <td className="py-3 pr-3 font-medium">
                  <Link to="/account/orders/$id" params={{ id: o.id }} className="hover:underline">
                    {o.id}
                  </Link>
                </td>
                <td className="py-3 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: c.accent }}
                    />
                    {c.name}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <a
                    href={c.trackingUrl(o.trackingNumber)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    {o.trackingNumber} <ExternalLink className="size-3" />
                  </a>
                </td>
                <td className="py-3 pr-3">{o.status}</td>
                <td className="py-3 pr-3 text-right">
                  {formatBDT(o.deliveryCharge ?? 0)}
                </td>
                <td className="py-3 pr-3 text-right">
                  <button
                    onClick={() => printLabel(o)}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <Printer className="size-3.5" /> Label
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChargeCalculator() {
  const [zone, setZone] = useState<DeliveryZone>("inside_dhaka");
  const [weight, setWeight] = useState(1);

  return (
    <section className="surface-card rounded-3xl p-5">
      <h2 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
        <Calculator className="size-4" /> Delivery charge calculator
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="text-muted-foreground">Delivery zone</span>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value as DeliveryZone)}
            className="border-input bg-background mt-1 w-full rounded-2xl border px-3 py-2 text-sm"
          >
            {(Object.keys(ZONE_LABEL) as DeliveryZone[]).map((z) => (
              <option key={z} value={z}>
                {ZONE_LABEL[z]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="text-muted-foreground">Parcel weight (kg)</span>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2">
        {PRIMARY_COURIERS.map((id) => {
          const c = COURIERS[id];
          const charge = calcDeliveryCharge(id, zone, weight);
          return (
            <div
              key={id}
              className="border-border flex items-center justify-between rounded-2xl border px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: c.accent }}
                />
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-muted-foreground text-[11px]">
                    Base {formatBDT(c.baseCharge[zone])} · +{formatBDT(c.perKg)}/kg
                    above 1kg · ETA {c.etaDays[0]}–{c.etaDays[1]}d
                  </div>
                </div>
              </div>
              <div className="text-display text-base font-semibold">
                {formatBDT(charge)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LabelsPanel() {
  const { orders } = useOrders();
  const [q, setQ] = useState("");
  const filtered = orders.filter(
    (o) =>
      !q ||
      o.id.toLowerCase().includes(q.toLowerCase()) ||
      (o.trackingNumber ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section className="surface-card rounded-3xl p-5">
      <h2 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
        <Printer className="size-4" /> Shipping labels
      </h2>
      <div className="relative mb-3">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by order or tracking #"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <ul className="divide-border divide-y">
        {filtered.map((o) => (
          <li key={o.id} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold">{o.id}</div>
              <div className="text-muted-foreground text-[11px]">
                {o.courier} · {o.trackingNumber}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => printLabel(o)}>
              <Printer className="size-3.5" /> Print label
            </Button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-muted-foreground py-6 text-center text-sm">No matches.</li>
        )}
      </ul>
    </section>
  );
}

export function printLabel(o: Order) {
  if (typeof window === "undefined") return;
  const c = COURIERS[o.courier];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${o.id} — Shipping label</title>
<style>
  body{font-family:ui-sans-serif,system-ui;margin:24px;color:#111}
  .label{border:2px solid #111;border-radius:12px;padding:20px;max-width:420px}
  .row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
  .brand{font-size:18px;font-weight:700}
  .courier{padding:4px 10px;border-radius:999px;color:#fff;font-size:12px;font-weight:600;background:${c.accent}}
  h2{margin:14px 0 4px;font-size:14px;color:#555;text-transform:uppercase;letter-spacing:.06em}
  .name{font-size:18px;font-weight:700}
  .muted{color:#555;font-size:13px;line-height:1.4}
  .barcode{font-family:'Libre Barcode 39',monospace;font-size:48px;text-align:center;letter-spacing:2px;margin-top:8px}
  .track{text-align:center;font-size:13px;letter-spacing:.1em}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;font-size:12px}
  .meta div b{display:block;color:#111;font-size:13px}
</style>
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
</head><body>
<div class="label">
  <div class="row">
    <div class="brand">DADAR SHOP</div>
    <div class="courier">${c.name}</div>
  </div>
  <h2>Ship to</h2>
  <div class="name">${o.shipTo.name}</div>
  <div class="muted">
    ${o.shipTo.line1}<br/>${o.shipTo.area}, ${o.shipTo.city}<br/>${o.shipTo.phone}
  </div>
  <h2>Tracking</h2>
  <div class="barcode">*${o.trackingNumber}*</div>
  <div class="track">${o.trackingNumber}</div>
  <div class="meta">
    <div><b>Order</b>${o.id}</div>
    <div><b>Payment</b>${o.paymentMethod}</div>
    <div><b>Weight</b>${(o.weightKg ?? 1).toFixed(1)} kg</div>
    <div><b>COD</b>${o.paymentMethod === "COD" ? formatBDT(o.total) : "—"}</div>
  </div>
</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=520,height=720");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
