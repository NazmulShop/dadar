import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Circle, Copy, Loader2, Truck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  REFUND_STATUS_TONE,
  formatBDT,
  formatDate,
  formatDay,
  type Refund,
  type RefundStatus,
} from "@/data/account";
import { accountFetch } from "@/lib/accountApi";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/account/refunds/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Refund ${params.id} — Dadar Shop` },
      { name: "description", content: `Track refund ${params.id} status, pickup and payout.` },
    ],
  }),
  component: RefundDetail,
});

function RefundDetail() {
  const { id } = Route.useParams();
  const { getToken } = useAuth();
  const [refund, setRefund] = useState<Refund | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    accountFetch<{ refunds: Refund[] }>("/refunds", getToken())
      .then((d) => {
        const found = (d.refunds ?? []).find((r) => r.id === id);
        if (found) setRefund(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function copyId() {
    navigator.clipboard.writeText(refund?.trackingNumber ?? refund?.id ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="text-primary size-7 animate-spin" />
      </div>
    );
  }

  if (notFound || !refund) {
    return (
      <div className="surface-card rounded-3xl p-8 text-center">
        <h2 className="text-display text-lg font-semibold">Refund not found</h2>
        <p className="text-muted-foreground mt-1 text-sm">We couldn't find that refund request.</p>
        <Button variant="hero" className="mt-4" asChild>
          <Link to="/account/refunds">Back to refunds</Link>
        </Button>
      </div>
    );
  }

  const tone = REFUND_STATUS_TONE[refund.status as RefundStatus];
  const completed = (refund.timeline ?? []).filter((e) => e.done).length;
  const timelineLen = (refund.timeline ?? []).length || 1;
  const progress = Math.round((completed / timelineLen) * 100);

  return (
    <div className="space-y-4">
      <Link
        to="/account/refunds"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> All refunds
      </Link>

      <header className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-display text-2xl font-semibold">{refund.id}</h1>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone)}>
                {refund.status}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {refund.productName} · from order{" "}
              <Link to="/account/orders/$id" params={{ id: refund.orderId }} className="text-primary font-medium">
                {refund.orderId}
              </Link>
            </p>
          </div>
          <div className="text-right">
            <div className="text-display text-2xl font-semibold">{formatBDT(refund.amount)}</div>
            <div className="text-muted-foreground text-[11px]">refund amount</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="bg-surface-muted h-2 overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-muted-foreground mt-1.5 flex justify-between text-[11px]">
            <span>{progress}% complete</span>
            <span>Expected by {formatDay(refund.expectedBy)}</span>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="surface-card rounded-3xl p-5">
          <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
            <Wallet className="size-4" /> Refund details
          </h3>
          <dl className="space-y-2 text-sm">
            <Row label="Reason" value={refund.reason} />
            <Row label="Method" value={refund.method} />
            <Row label="Requested" value={formatDate(refund.requestedAt)} />
            <Row label="Expected by" value={formatDay(refund.expectedBy)} />
            {refund.notes && <Row label="Note" value={refund.notes} />}
          </dl>
        </div>

        <div className="surface-card rounded-3xl p-5">
          <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
            <Truck className="size-4" /> Return shipment
          </h3>
          {refund.trackingNumber ? (
            <>
              <dl className="space-y-2 text-sm">
                <Row label="Courier" value={refund.courier ?? "—"} />
                <Row label="Tracking #" value={refund.trackingNumber} />
              </dl>
              <Button size="sm" variant="outline" onClick={copyId} className="mt-3 gap-1">
                <Copy className="size-3.5" /> {copied ? "Copied!" : "Copy tracking"}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Pickup not scheduled yet. We'll notify you once a courier is assigned.
            </p>
          )}
        </div>
      </section>

      {refund.timeline && refund.timeline.length > 0 && (
        <section className="surface-card rounded-3xl p-5">
          <h3 className="text-display mb-4 text-sm font-semibold">Refund timeline</h3>
          <ol className="space-y-4">
            {refund.timeline.map((e, i) => {
              const Icon = e.done ? CheckCircle2 : Circle;
              return (
                <li key={i} className="flex gap-3">
                  <Icon className={cn("mt-0.5 size-5 shrink-0", e.done ? "text-emerald-600" : "text-muted-foreground/40")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className={cn("text-sm font-semibold", !e.done && "text-muted-foreground")}>
                        {e.status}
                      </span>
                      <span className="text-muted-foreground text-[11px] tabular-nums">
                        {e.at ? formatDate(e.at) : "Pending"}
                      </span>
                    </div>
                    {e.note && <p className="text-muted-foreground mt-0.5 text-xs">{e.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 pb-1.5 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground text-right text-xs font-medium">{value}</dd>
    </div>
  );
}
