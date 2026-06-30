import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Filter, Package, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  REFUND_STATUS_TONE,
  formatBDT,
  formatDay,
  type RefundStatus,
  type Refund,
} from "@/data/account";
import { accountFetch } from "@/lib/accountApi";
import { useAuth } from "@/lib/authStore";

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

function RefundsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChildActive =
    pathname !== "/account/refunds" && pathname.startsWith("/account/refunds/");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "completed" | "rejected">("all");

  const { getToken } = useAuth();
  const [refunds, setRefunds] = useState<Refund[]>([]);

  useEffect(() => {
    accountFetch<{ refunds: Refund[] }>("/refunds", getToken())
      .then((d) => setRefunds(Array.isArray(d.refunds) ? d.refunds : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <Button variant="hero" size="sm" asChild>
          <Link to="/account/orders">Request a refund</Link>
        </Button>
      </header>

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
