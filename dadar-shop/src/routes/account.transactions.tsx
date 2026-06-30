import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Receipt, ArrowRight, Wallet, CheckCircle2, Clock, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHODS,
  STATUS_TONE,
  usePayments,
} from "@/lib/paymentStore";
import { formatBDT } from "@/data/account";

export const Route = createFileRoute("/account/transactions")({
  head: () => ({
    meta: [
      { title: "Transaction History — Dadar Shop" },
      { name: "description", content: "View all your payment transactions, refunds and receipts." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { state } = usePayments();
  const txs = state.transactions;

  const totals = useMemo(() => {
    let paid = 0, pending = 0, refunded = 0;
    for (const t of txs) {
      if (t.status === "paid") paid += t.amount;
      else if (t.status === "pending" || t.status === "processing") pending += t.amount;
      else if (t.status === "refunded") refunded += t.amount;
    }
    return { paid, pending, refunded };
  }, [txs]);

  return (
    <div className="space-y-4">
      <header className="surface-card flex items-center justify-between rounded-3xl p-5">
        <div>
          <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
            <Receipt className="size-6" /> Transaction history
          </h1>
          <p className="text-muted-foreground text-xs">
            Every payment you've made on Dadar Shop, with status & refunds.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/payments">Full payments view <ArrowRight className="size-3.5" /></Link>
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Transactions" value={txs.length.toString()} icon={<Receipt className="size-3.5" />} />
        <Stat label="Paid" value={formatBDT(totals.paid)} tone="success" icon={<CheckCircle2 className="size-3.5" />} />
        <Stat label="Pending" value={formatBDT(totals.pending)} tone="warn" icon={<Clock className="size-3.5" />} />
        <Stat label="Refunded" value={formatBDT(totals.refunded)} tone="muted" icon={<RotateCcw className="size-3.5" />} />
      </section>

      {txs.length === 0 ? (
        <div className="surface-card rounded-3xl border border-dashed p-10 text-center">
          <Wallet className="text-muted-foreground mx-auto mb-3 size-10" />
          <h2 className="text-display text-lg font-semibold">No transactions yet</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            When you make a payment at checkout, the receipt shows up here.
          </p>
          <Button asChild variant="hero" className="mt-5">
            <Link to="/shop">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <section className="surface-card divide-border divide-y rounded-3xl">
          {txs.map((t) => {
            const meta = PAYMENT_METHODS.find((m) => m.id === t.method)!;
            const tone = STATUS_TONE[t.status];
            return (
              <article key={t.id} className="flex items-center gap-3 p-4">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.label.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{t.id}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone.cls)}>
                      {tone.label}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    {meta.label} · Order {t.orderId} · {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{formatBDT(t.amount)}</div>
                  {t.trxRef && (
                    <div className="text-muted-foreground text-[10px]">Trx {t.trxRef}</div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

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
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
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