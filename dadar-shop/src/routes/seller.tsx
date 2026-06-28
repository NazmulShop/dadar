import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Banknote, Boxes, DollarSign, Package, Store, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBDT, formatDay } from "@/data/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/seller")({
  head: () => ({
    meta: [
      { title: "Seller Portal — Dadar Shop" },
      { name: "description", content: "Seller dashboard: products, orders, earnings and withdrawals." },
    ],
  }),
  component: SellerPortal,
});

type Tab = "dashboard" | "products" | "orders" | "earnings" | "withdrawals";

function SellerPortal() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: Store },
    { id: "products", label: "Products", icon: Boxes },
    { id: "orders", label: "Orders", icon: Package },
    { id: "earnings", label: "Earnings", icon: DollarSign },
    { id: "withdrawals", label: "Withdrawals", icon: Banknote },
  ];

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="size-3.5" /> Back to admin
        </Link>
        <header className="surface-card mb-4 rounded-3xl p-6">
          <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
            <Store className="size-7" /> Dhaka Threads · Seller Portal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your storefront, orders and payouts.</p>
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

        {tab === "dashboard" && <Dashboard />}
        {tab === "products" && <Products />}
        {tab === "orders" && <Orders />}
        {tab === "earnings" && <Earnings />}
        {tab === "withdrawals" && <Withdrawals />}
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { l: "Today's sales", v: formatBDT(8420) },
          { l: "Orders (30d)", v: "187" },
          { l: "Revenue (30d)", v: formatBDT(184500) },
          { l: "Available balance", v: formatBDT(24800) },
        ].map((k) => (
          <div key={k.l} className="surface-card rounded-3xl p-4">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{k.l}</div>
            <div className="text-display mt-1 text-2xl font-semibold tabular-nums">{k.v}</div>
          </div>
        ))}
      </div>
      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-2 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="size-4" /> Recent activity
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between border-b border-border/40 pb-1.5">New order DS-10248 · {formatDay("2026-06-12T00:00:00Z")} <span className="font-semibold">{formatBDT(4870)}</span></li>
          <li className="flex justify-between border-b border-border/40 pb-1.5">Payout released · {formatDay("2026-06-10T00:00:00Z")} <span className="font-semibold text-emerald-700">{formatBDT(18200)}</span></li>
          <li className="flex justify-between">Review received · 4.8★</li>
        </ul>
      </section>
    </div>
  );
}

function Products() {
  const rows = [
    { id: "P-1", n: "Linen Kurta", price: 1890, stock: 42, status: "Active" },
    { id: "P-2", n: "Cotton Punjabi", price: 2390, stock: 18, status: "Active" },
    { id: "P-3", n: "Denim Shirt", price: 1690, stock: 4, status: "Low" },
    { id: "P-4", n: "Linen Trouser", price: 1490, stock: 0, status: "Out" },
  ];
  return (
    <section className="surface-card overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-display text-sm font-semibold">My products</h3>
        <Button variant="hero" size="sm">+ Add product</Button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-muted text-muted-foreground text-[11px] uppercase">
          <tr><th className="px-4 py-2">Product</th><th>Price</th><th>Stock</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-border border-t">
              <td className="px-4 py-2 font-medium">{r.n}</td>
              <td>{formatBDT(r.price)}</td>
              <td>{r.stock}</td>
              <td>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  r.status === "Active" ? "bg-emerald-100 text-emerald-800" :
                  r.status === "Low" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800")}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Orders() {
  const rows = [
    { id: "DS-10248", buyer: "Arif H.", total: 4870, status: "Processing" },
    { id: "DS-10241", buyer: "Sumaiya A.", total: 1280, status: "Shipped" },
    { id: "DS-10219", buyer: "Rakib K.", total: 2390, status: "Delivered" },
  ];
  return (
    <section className="surface-card overflow-hidden rounded-3xl">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-muted text-muted-foreground text-[11px] uppercase">
          <tr><th className="px-4 py-2">Order</th><th>Buyer</th><th>Total</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-border border-t">
              <td className="px-4 py-2 font-medium">{r.id}</td>
              <td>{r.buyer}</td>
              <td className="font-semibold">{formatBDT(r.total)}</td>
              <td><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Earnings() {
  const rows = [
    { m: "Jun 2026", gross: 184500, comm: 22140, net: 162360 },
    { m: "May 2026", gross: 167200, comm: 20064, net: 147136 },
    { m: "Apr 2026", gross: 142800, comm: 17136, net: 125664 },
  ];
  return (
    <section className="surface-card overflow-hidden rounded-3xl p-5">
      <h3 className="text-display mb-3 text-sm font-semibold">Earnings statement</h3>
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground text-[11px] uppercase">
          <tr><th className="py-2">Month</th><th>Gross</th><th>Commission (12%)</th><th>Net</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.m} className="border-border border-t">
              <td className="py-2 font-medium">{r.m}</td>
              <td>{formatBDT(r.gross)}</td>
              <td className="text-rose-600">- {formatBDT(r.comm)}</td>
              <td className="font-semibold text-emerald-700">{formatBDT(r.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Withdrawals() {
  const [amount, setAmount] = useState("");
  const history = [
    { d: "2026-06-10T00:00:00Z", amt: 18200, m: "bKash · +88017XXX", s: "Completed" },
    { d: "2026-05-20T00:00:00Z", amt: 22400, m: "BRAC Bank · 1501-203-457821", s: "Completed" },
    { d: "2026-05-02T00:00:00Z", amt: 12800, m: "Nagad · +88017XXX", s: "Completed" },
  ];
  return (
    <div className="space-y-4">
      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-3 text-sm font-semibold">Request withdrawal</h3>
        <div className="bg-surface-muted mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
          Available balance: <strong className="tabular-nums">{formatBDT(24800)}</strong>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setAmount(""); }}>
          <Input
            type="number"
            placeholder="Amount in BDT"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1"
          />
          <Button variant="hero" type="submit">Request payout</Button>
        </form>
        <p className="text-muted-foreground mt-2 text-xs">
          Payouts go to your default payout method (set in account).
        </p>
      </section>

      <section className="surface-card overflow-hidden rounded-3xl">
        <h3 className="text-display p-5 pb-2 text-sm font-semibold">Withdrawal history</h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-muted-foreground text-[11px] uppercase">
            <tr><th className="px-4 py-2">Date</th><th>Method</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.d} className="border-border border-t">
                <td className="px-4 py-2">{formatDay(h.d)}</td>
                <td className="text-muted-foreground">{h.m}</td>
                <td className="font-semibold">{formatBDT(h.amt)}</td>
                <td><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{h.s}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
