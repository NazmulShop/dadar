import { createFileRoute } from "@tanstack/react-router";
import {
  BadgePercent,
  Bell,
  Check,
  Copy,
  Gift,
  Megaphone,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBDT, formatDay } from "@/data/account";
import {
  CASHBACK_TIERS,
  COUPONS,
  PUSH_PREFERENCES,
  type PushPreference,
} from "@/data/marketing";

// These will come from the API in future — empty until backend supports them
const PROMO_CODES: any[] = [];
const GIFT_CARDS: any[] = [];
const CASHBACK_HISTORY: any[] = [];
const CASHBACK_WALLET = 0;

export const Route = createFileRoute("/account/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing & Rewards — Dadar Shop" },
      {
        name: "description",
        content:
          "Your coupons, promo codes, gift cards, cashback wallet, affiliate program and push notifications.",
      },
    ],
  }),
  component: MarketingPage,
});

type Tab = "coupons" | "promos" | "giftcards" | "cashback" | "affiliate" | "push";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "promos", label: "Promo codes", icon: BadgePercent },
  { id: "giftcards", label: "Gift cards", icon: Gift },
  { id: "cashback", label: "Cashback", icon: Wallet },
  { id: "affiliate", label: "Affiliate", icon: Users },
  { id: "push", label: "Push", icon: Bell },
];

function MarketingPage() {
  const [tab, setTab] = useState<Tab>("coupons");

  return (
    <div className="space-y-4">
      <header className="surface-card rounded-3xl p-5">
        <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
          <Megaphone className="size-6" /> Marketing & Rewards
        </h1>
        <p className="text-muted-foreground text-xs">
          Coupons, promo codes, gift cards, cashback, affiliate and push notifications.
        </p>
      </header>

      <nav className="surface-card -mx-1 flex gap-1 overflow-x-auto rounded-3xl p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "tap-scale tap-scale-active inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-surface-muted",
              )}
            >
              <Icon className="size-3.5" /> {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "coupons" && <CouponsPanel />}
      {tab === "promos" && <PromosPanel />}
      {tab === "giftcards" && <GiftCardsPanel />}
      {tab === "cashback" && <CashbackPanel />}
      {tab === "affiliate" && <AffiliatePanel />}
      {tab === "push" && <PushPanel />}
    </div>
  );
}

/* -------------------------------- Coupons ------------------------------- */

function CouponsPanel() {
  const marketingCoupons = COUPONS.filter((c) => c.title);
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {marketingCoupons.map((c) => (
        <article key={c.code} className="surface-card relative overflow-hidden rounded-3xl p-5">
          <div className="bg-primary/10 text-primary absolute -right-6 -top-6 size-24 rounded-full" />
          <div className="text-primary inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles className="size-3" /> {c.kind === "percent" ? `${c.value}% OFF` : `৳${c.value} OFF`}
          </div>
          <h3 className="text-display mt-1 text-lg font-semibold">{c.title}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">{c.description}</p>
          <div className="text-muted-foreground mt-2 text-[11px]">
            Min order {formatBDT(c.minSubtotal ?? 0)}
            {c.maxDiscount && ` · Max ${formatBDT(c.maxDiscount)}`}
            {c.expiresAt && <> · Exp {formatDay(c.expiresAt)}</>}
          </div>
          <CopyChip code={c.code} />
        </article>
      ))}
    </section>
  );
}

/* -------------------------------- Promos -------------------------------- */

function PromosPanel() {
  return (
    <section className="surface-card divide-border divide-y rounded-3xl">
      {PROMO_CODES.map((p) => (
        <div key={p.code} className="flex flex-wrap items-center gap-3 p-4">
          <div className="bg-amber/15 text-amber-700 flex size-10 items-center justify-center rounded-2xl">
            <BadgePercent className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{p.campaign}</div>
            <div className="text-muted-foreground text-xs">{p.perks}</div>
            <div className="text-muted-foreground mt-0.5 text-[11px]">
              {p.uses}/{p.limit} redeemed · Exp {formatDay(p.expiresAt)}
            </div>
          </div>
          <CopyChip code={p.code} />
        </div>
      ))}
    </section>
  );
}

/* ------------------------------- Gift cards ----------------------------- */

function GiftCardsPanel() {
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {GIFT_CARDS.map((g) => {
        const label =
          g.type === "delivery_free"
            ? "Free delivery voucher"
            : g.type === "delivery_discount"
              ? `৳${g.value} delivery discount`
              : `৳${g.value} store credit`;
        return (
          <article key={g.id} className="surface-card overflow-hidden rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                <Gift className="size-3" /> {label}
              </div>
              <span className="text-muted-foreground text-[10px]">Exp {formatDay(g.expiresAt)}</span>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">{g.description}</p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Balance</div>
                <div className="text-display text-lg font-semibold">
                  {g.type === "store_credit" ? formatBDT(g.balance) : `${g.balance} use${g.balance > 1 ? "s" : ""}`}
                </div>
              </div>
              <CopyChip code={g.code} />
            </div>
          </article>
        );
      })}
    </section>
  );
}

/* -------------------------------- Cashback ------------------------------ */

function CashbackPanel() {
  const earned = CASHBACK_HISTORY.reduce((s, c) => s + c.amount, 0);
  return (
    <div className="space-y-3">
      <section className="surface-card rounded-3xl p-5">
        <div className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase tracking-wide">
          <Wallet className="size-3" /> Cashback wallet
        </div>
        <div className="text-display mt-1 text-3xl font-semibold">{formatBDT(CASHBACK_WALLET)}</div>
        <div className="text-muted-foreground text-xs">
          Lifetime earned {formatBDT(earned)} · Auto-applies at checkout
        </div>
      </section>

      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-3 text-sm font-semibold">Your tier rate</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {CASHBACK_TIERS.map((t) => (
            <div key={t.name} className="bg-surface-muted rounded-2xl p-3">
              <div className="text-xs font-semibold">{t.name}</div>
              <div className="text-display text-xl font-semibold">{t.rate}%</div>
              <div className="text-muted-foreground text-[11px]">
                Spend {formatBDT(t.minSpend)}+ / 90d
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-3xl p-5">
        <h3 className="text-display mb-2 text-sm font-semibold">Recent cashback</h3>
        <ul className="divide-border divide-y">
          {CASHBACK_HISTORY.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-sm font-medium">{c.orderId}</div>
                <div className="text-muted-foreground text-[11px]">{formatDay(c.at)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-emerald-700">+{formatBDT(c.amount)}</div>
                <div className={cn("text-[10px] font-medium", c.status === "credited" ? "text-emerald-700" : "text-amber-700")}>
                  {c.status}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* -------------------------------- Affiliate ----------------------------- */

function AffiliatePanel() {
  return (
    <section className="surface-card relative overflow-hidden rounded-3xl p-8 text-center">
      <div className="bg-primary/10 text-primary mx-auto inline-flex size-14 items-center justify-center rounded-2xl">
        <Users className="size-7" />
      </div>
      <h3 className="text-display mt-4 text-2xl font-semibold">Affiliate System</h3>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
        Earn commissions by referring friends, creators and influencers to Dadar Shop.
        Custom links, real-time earnings, monthly payouts.
      </p>
      <span className="bg-amber/15 text-amber-700 mt-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold">
        <Sparkles className="size-3" /> Coming soon
      </span>
      <div className="text-muted-foreground mt-3 text-[11px]">
        We'll notify you the moment applications open.
      </div>
    </section>
  );
}

/* ----------------------------- Push notifications ----------------------- */

function PushPanel() {
  const [prefs, setPrefs] = useState<PushPreference[]>(PUSH_PREFERENCES);
  function toggle(key: PushPreference["key"]) {
    setPrefs((p) => p.map((x) => (x.key === key ? { ...x, enabled: !x.enabled } : x)));
  }
  return (
    <section className="surface-card divide-border divide-y rounded-3xl">
      <div className="p-5">
        <h3 className="text-display flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4" /> Push notifications
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Choose what we ping you about on this device.
        </p>
      </div>
      {prefs.map((p) => (
        <div key={p.key} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{p.label}</div>
            <div className="text-muted-foreground text-xs">{p.description}</div>
          </div>
          <button
            onClick={() => toggle(p.key)}
            className={cn(
              "relative h-6 w-11 rounded-full transition",
              p.enabled ? "bg-primary" : "bg-surface-muted",
            )}
            aria-pressed={p.enabled}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white shadow transition",
                p.enabled ? "left-5" : "left-0.5",
              )}
            />
          </button>
        </div>
      ))}
    </section>
  );
}

/* -------------------------------- Shared -------------------------------- */

function CopyChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-3 font-mono"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {code}
    </Button>
  );
}

// silence unused-import for TrendingUp until needed elsewhere
void TrendingUp;