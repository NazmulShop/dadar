import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Filter, Package, Plus, RotateCcw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  REFUND_STATUS_TONE,
  formatBDT,
  formatDay,
  type RefundStatus,
  type RefundReason,
  type RefundMethod,
  type Refund,
} from "@/data/account";
import { accountFetch } from "@/lib/accountApi";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/account/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds — Dadar Shop" },
      {
        name: "description",
        content:
          "Track every refund request, its current status, pickup details, expected refund date and method.",
      },
    ],
  }),
  component: RefundsPage,
});

const FILTERS: { id: "all" | "open" | "completed" | "rejected"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "rejected", label: "Rejected" },
];

const REASONS: RefundReason[] = [
  "Wrong item delivered", "Damaged on arrival", "Size / fit issue",
  "Quality not as described", "Changed my mind", "Late delivery", "Other",
];
const METHODS: RefundMethod[] = ["Original payment", "bKash", "Nagad", "Bank transfer", "Store credit"];

interface OrderOption { id: string; total: number; status: string }

function RefundsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChildActive =
    pathname !== "/account/refunds" && pathname.startsWith("/account/refunds/");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "completed" | "rejected">("all");

  const { getToken } = useAuth();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    orderId: "", productName: "", reason: REASONS[0], method: METHODS[0], amount: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function loadRefunds() {
    accountFetch<{ refunds: Refund[] }>("/refunds", getToken())
      .then((d) => setRefunds(Array.isArray(d.refunds) ? d.refunds : []))
      .catch(() => {});
  }

  useEffect(() => {
    loadRefunds();
    accountFetch<{ orders: OrderOption[] }>("/orders", getToken())
      .then((d) => setOrders(Array.isArray(d.orders) ? d.orders : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitRequest() {
    if (!form.orderId) { toast.error("Select an order"); return; }
    if (!form.productName.trim()) { toast.error("Enter the product name"); return; }
    const amount = parseInt(form.amount, 10);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid refund amount"); return; }
    setSubmitting(true);
    try {
      await accountFetch("/refunds", getToken(), {
        method: "POST",
        body: JSON.stringify({
          orderId: form.orderId, productName: form.productName.trim(),
          reason: form.reason, method: form.method, amount,
        }),
      });
      toast.success("Refund request submitted");
      setShowForm(false);
      setForm({ orderId: "", productName: "", reason: REASONS[0], method: METHODS[0], amount: "" });
      loadRefunds();
    } catch {
      toast.error("Couldn't submit refund request");
    } finally {
      setSubmitting(false);
    }
  }

  const list = useMemo(() => {
    return refunds.filter((r) => {
      if (filter === "completed") return r.status === "Completed";
      if (filter === "rejected") return r.status === "Rejected";
      if (filter === "open") return r.status !== "Completed" && r.status !== "Rejected";
      return true;
    }).filter(
      (r) =>
        !q ||
        r.id.toLowerCase().includes(q.toLowerCase()) ||
        r.orderId.toLowerCase().includes(q.toLowerCase()) ||
        r.productName.toLowerCase().includes(q.toLowerCase()),
    );
  }, [q, filter, refunds]);

  const totals = useMemo(() => {
    const inProgress = refunds.filter(
      (r) => r.status !== "Completed" && r.status !== "Rejected",
    ).length;
    const refunded = refunds.filter((r) => r.status === "Completed").reduce(
      (s, r) => s + r.amount,
      0,
    );
    const pending = refunds.filter(
      (r) => r.status !== "Completed" && r.status !== "Rejected",
    ).reduce((s, r) => s + r.amount, 0);
    return { inProgress, refunded, pending };
  }, [refunds]);

  // When a child route like /account/refunds/RF-XXXX is active, render only the child.
  if (isChildActive) {
    return <Outlet />;
  }

  return (
    <div className="space-y-4">
      <header className="surface-card flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
            <RotateCcw className="size-6" /> Refunds
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track returns from request to wallet credit.
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X className="size-4 mr-1" /> : <Plus className="size-4 mr-1" />}
          {showForm ? "Cancel" : "Request a refund"}
        </Button>
      </header>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">New refund request</h3>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">You have no orders to request a refund for yet.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Order</Label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                    value={form.orderId}
                    onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                  >
                    <option value="">Select an order…</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>{o.id} — {formatBDT(o.total)} ({o.status})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Product</Label>
                  <Input className="mt-1" placeholder="Which item?" value={form.productName}
                    onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} />
                </div>
                <div>
                  <Label>Reason</Label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value as RefundReason }))}
                  >
                    {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Refund method</Label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                    value={form.method}
                    onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as RefundMethod }))}
                  >
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Amount (৳)</Label>
                  <Input className="mt-1" type="number" placeholder="e.g. 1200" value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <Button variant="hero" size="sm" onClick={submitRequest} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit request"}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="In progress" value={totals.inProgress.toString()} hint="Open requests" />
        <StatCard label="Pending amount" value={formatBDT(totals.pending)} hint="To be refunded" />
        <StatCard label="Total refunded" value={formatBDT(totals.refunded)} hint="All time" tone="success" />
      </div>

      <div className="surface-card flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by refund ID, order ID or product"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter className="text-muted-foreground size-4 shrink-0" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-foreground hover:bg-surface-muted/80",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-3">
        {list.length === 0 && (
          <li className="surface-card rounded-3xl p-8 text-center">
            <Package className="text-muted-foreground mx-auto mb-2 size-8" />
            <p className="text-muted-foreground text-sm">No refunds match your filters.</p>
          </li>
        )}
        {list.map((r) => {
          const tone = REFUND_STATUS_TONE[r.status as RefundStatus];
          const completed = r.timeline.filter((e) => e.done).length;
          const progress = Math.round((completed / r.timeline.length) * 100);
          return (
            <li key={r.id} className="surface-card rounded-3xl p-5">
              <Link
                to="/account/refunds/$id"
                params={{ id: r.id }}
                className="block"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-display text-base font-semibold">{r.id}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone)}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      For order{" "}
                      <span className="text-foreground font-medium">{r.orderId}</span> ·{" "}
                      {r.productName}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      Requested {formatDay(r.requestedAt)} · Expected by {formatDay(r.expectedBy)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-display text-lg font-semibold">{formatBDT(r.amount)}</div>
                    <div className="text-muted-foreground text-[11px]">via {r.method}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="bg-surface-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px]">
                    <span>{completed} / {r.timeline.length} steps</span>
                    {r.courier && r.trackingNumber && (
                      <span>{r.courier} · {r.trackingNumber}</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "success";
}) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
      <div
        className={cn(
          "text-display mt-1 text-2xl font-semibold tabular-nums",
          tone === "success" && "text-emerald-700",
        )}
      >
        {value}
      </div>
      <div className="text-muted-foreground mt-0.5 text-[11px]">{hint}</div>
    </div>
  );
}
