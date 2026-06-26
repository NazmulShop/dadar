import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Filter,
  ListChecks,
  Receipt,
  RefreshCcw,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StickyHeader } from "@/components/shop/StickyHeader";
import {
  PAYMENT_METHODS,
  STATUS_TONE,
  usePaymentActions,
  usePayments,
  type PaymentStatus,
  type Transaction,
} from "@/lib/paymentStore";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Dadar Shop" },
      {
        name: "description",
        content:
          "View your transaction history, payment status, audit logs and request or manage refunds.",
      },
    ],
  }),
  component: PaymentsPage,
});

const STATUS_FILTERS: ("all" | PaymentStatus)[] = [
  "all",
  "pending",
  "processing",
  "paid",
  "failed",
  "refund_requested",
  "refunded",
  "cancelled",
];

function PaymentsPage() {
  const { state } = usePayments();
  const { clearAll } = usePaymentActions();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.transactions.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (methodFilter !== "all" && t.method !== methodFilter) return false;
      if (!needle) return true;
      return (
        t.id.toLowerCase().includes(needle) ||
        t.orderId.toLowerCase().includes(needle) ||
        t.customerName.toLowerCase().includes(needle) ||
        t.customerPhone.includes(needle) ||
        (t.trxRef ?? "").toLowerCase().includes(needle)
      );
    });
  }, [state.transactions, q, statusFilter, methodFilter]);

  const totals = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let refunded = 0;
    for (const t of state.transactions) {
      if (t.status === "paid") paid += t.amount;
      else if (t.status === "pending" || t.status === "processing") pending += t.amount;
      else if (t.status === "refunded") refunded += t.amount;
    }
    return { paid, pending, refunded, count: state.transactions.length };
  }, [state.transactions]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <StickyHeader />
      <div className="mx-auto w-full max-w-[820px] px-4 pt-2">
        <Link
          to="/"
          className="tap-scale tap-scale-active mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>

        <header className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-display text-2xl font-semibold">Payments</h1>
            <p className="text-xs text-muted-foreground">
              Transaction history, status, logs & refunds
            </p>
          </div>
          {state.transactions.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear all transactions? This cannot be undone.")) clearAll();
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" /> Clear all
            </button>
          )}
        </header>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Transactions" value={totals.count.toString()} icon={<Receipt className="size-3.5" />} />
          <Stat label="Paid" value={`৳${totals.paid.toLocaleString()}`} tone="success" />
          <Stat label="Pending" value={`৳${totals.pending.toLocaleString()}`} tone="warn" />
          <Stat label="Refunded" value={`৳${totals.refunded.toLocaleString()}`} tone="muted" />
        </div>

        {/* Filters */}
        <div className="surface-card mt-4 rounded-3xl p-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-pill border border-border bg-surface px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search TXN / order / phone / TrxID"
                className="h-10 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="mt-2 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <Chip
                  key={s}
                  label={s === "all" ? "All status" : STATUS_TONE[s].label}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                />
              ))}
            </div>
          </div>
          <div className="mt-1.5 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-1.5">
              <Chip label="All methods" active={methodFilter === "all"} onClick={() => setMethodFilter("all")} />
              {PAYMENT_METHODS.map((m) => (
                <Chip
                  key={m.id}
                  label={m.label}
                  active={methodFilter === m.id}
                  onClick={() => setMethodFilter(m.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <section className="mt-4 space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
              <Filter className="mx-auto mb-3 size-8 text-muted-foreground" />
              <h2 className="text-display text-lg font-semibold">
                {state.transactions.length === 0
                  ? "No transactions yet"
                  : "Nothing matches these filters"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.transactions.length === 0
                  ? "Place an order from the checkout to see it here."
                  : "Try a different search or clear filters."}
              </p>
              {state.transactions.length === 0 && (
                <Button asChild variant="hero" size="default" className="mt-5">
                  <Link to="/shop">Go shopping</Link>
                </Button>
              )}
            </div>
          )}

          {filtered.map((t) => (
            <TransactionRow
              key={t.id}
              tx={t}
              open={openId === t.id}
              onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

/* ----------------------------- Row & detail ----------------------------- */

function TransactionRow({
  tx,
  open,
  onToggle,
}: {
  tx: Transaction;
  open: boolean;
  onToggle: () => void;
}) {
  const tone = STATUS_TONE[tx.status];
  const meta = PAYMENT_METHODS.find((m) => m.id === tx.method)!;
  const { updateStatus, requestRefund, resolveRefund } = usePaymentActions();
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(tx.amount);
  const [refundReason, setRefundReason] = useState("");

  const canRefund = tx.status === "paid" || tx.status === "pending";
  const canMarkPaid = tx.status === "processing" || tx.status === "pending";
  const canFail = tx.status === "processing" || tx.status === "pending";

  return (
    <article className="surface-card rounded-3xl">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
          style={{ backgroundColor: meta.color }}
        >
          {meta.label.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{tx.id}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone.cls)}>
              {tone.label}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {meta.label} · {tx.customerName} · {new Date(tx.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">৳{tx.amount.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">Order {tx.orderId}</div>
        </div>
        <ChevronDown
          className={cn("ml-1 size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-border p-3">
          {/* Customer + ref */}
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <DInfo label="Customer" value={tx.customerName} />
            <DInfo label="Phone" value={tx.customerPhone} />
            {tx.trxRef && <DInfo label="TrxID" value={tx.trxRef} />}
            <DInfo label="Method" value={meta.label} />
          </dl>

          {/* Status actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {canMarkPaid && (
              <Action
                tone="success"
                icon={<CheckCircle2 className="size-3.5" />}
                onClick={() => updateStatus(tx.id, "paid", "Manually marked as paid")}
              >
                Mark paid
              </Action>
            )}
            {canFail && (
              <Action
                tone="danger"
                icon={<XCircle className="size-3.5" />}
                onClick={() => updateStatus(tx.id, "failed", "Marked as failed")}
              >
                Mark failed
              </Action>
            )}
            {tx.status !== "cancelled" && tx.status !== "refunded" && (
              <Action
                tone="neutral"
                icon={<RefreshCcw className="size-3.5" />}
                onClick={() => updateStatus(tx.id, "processing", "Re-processing payment")}
              >
                Re-process
              </Action>
            )}
            {canRefund && (
              <Action
                tone="violet"
                icon={<RotateCcw className="size-3.5" />}
                onClick={() => setRefundOpen((o) => !o)}
              >
                {refundOpen ? "Close refund" : "Request refund"}
              </Action>
            )}
          </div>

          {refundOpen && canRefund && (
            <div className="mt-3 rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 p-3">
              <div className="text-xs font-semibold">Refund request</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block text-[11px] text-muted-foreground">
                  Amount (৳)
                  <input
                    type="number"
                    value={refundAmount}
                    max={tx.amount}
                    min={1}
                    onChange={(e) =>
                      setRefundAmount(Math.min(tx.amount, Math.max(1, Number(e.target.value) || 0)))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-surface px-2 text-sm text-foreground outline-none focus-visible:border-primary"
                  />
                </label>
                <label className="block text-[11px] text-muted-foreground">
                  Reason
                  <input
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value.slice(0, 80))}
                    placeholder="Not as described"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-surface px-2 text-sm text-foreground outline-none focus-visible:border-primary"
                  />
                </label>
              </div>
              <Button
                variant="hero"
                size="sm"
                className="mt-2 w-full"
                disabled={!refundReason.trim() || refundAmount <= 0}
                onClick={() => {
                  requestRefund(tx.id, refundAmount, refundReason.trim() || "—");
                  setRefundOpen(false);
                  setRefundReason("");
                }}
              >
                Submit refund request
              </Button>
            </div>
          )}

          {/* Refunds list */}
          {tx.refunds.length > 0 && (
            <div className="mt-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <RotateCcw className="size-3" /> Refunds
              </h4>
              <ul className="space-y-1.5">
                {tx.refunds.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-border bg-surface p-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{r.id}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          r.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : r.status === "approved"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-muted-foreground">
                      ৳{r.amount.toLocaleString()} · {r.reason}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(r.requestedAt).toLocaleString()}
                      {r.resolvedAt && ` → ${new Date(r.resolvedAt).toLocaleString()}`}
                    </div>
                    {r.status === "requested" && (
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          onClick={() => resolveRefund(tx.id, r.id, "approved", "Approved")}
                          className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => resolveRefund(tx.id, r.id, "completed", "Refunded to wallet")}
                          className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white"
                        >
                          Mark refunded
                        </button>
                        <button
                          onClick={() => resolveRefund(tx.id, r.id, "rejected", "Rejected")}
                          className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Logs */}
          <div className="mt-3">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="size-3" /> Payment logs
            </h4>
            <ol className="space-y-1.5">
              {tx.logs.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <CircleDot
                    className={cn(
                      "mt-0.5 size-3 shrink-0",
                      l.level === "success" && "text-emerald-600",
                      l.level === "warn" && "text-amber-600",
                      l.level === "error" && "text-rose-600",
                      l.level === "info" && "text-blue-600",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground">{l.message}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(l.at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </article>
  );
}

/* ----------------------------- Primitives ------------------------------- */

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "success" | "warn" | "muted";
  icon?: React.ReactNode;
}) {
  return (
    <div className="surface-card rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "text-display mt-1 text-lg font-semibold tabular-nums",
          tone === "success" && "text-emerald-700",
          tone === "warn" && "text-amber-700",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tap-scale tap-scale-active shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function DInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function Action({
  children,
  icon,
  onClick,
  tone = "neutral",
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "success" | "danger" | "violet" | "neutral";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
        tone === "success" && "bg-emerald-600 text-white hover:bg-emerald-700",
        tone === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        tone === "violet" && "bg-violet-600 text-white hover:bg-violet-700",
        tone === "neutral" && "border border-border bg-surface text-foreground hover:bg-muted",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
