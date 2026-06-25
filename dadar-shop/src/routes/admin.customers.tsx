import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Award, Mail, Phone, Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/data/account";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/authStore";
import { API_ORIGIN } from "@/lib/accountApi";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: "Silver" | "Gold" | "Platinum";
  orders: number;
  spend: number;
  points: number;
  supportTickets: number;
  lastOrder: string;
}

const TIER_TONE: Record<Customer["tier"], string> = {
  Silver: "bg-slate-100 text-slate-700",
  Gold: "bg-amber-100 text-amber-800",
  Platinum: "bg-violet-100 text-violet-800",
};

function useCustomers() {
  const { getToken } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_ORIGIN}/api/admin/customers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setCustomers(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { customers, loading };
}

function CustomersPage() {
  const [q, setQ] = useState("");
  const { customers, loading } = useCustomers();
  const [selected, setSelected] = useState<Customer | null>(null);

  useEffect(() => {
    if (customers.length > 0 && !selected) setSelected(customers[0]);
  }, [customers]);

  const list = useMemo(
    () =>
      customers.filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.email.toLowerCase().includes(q.toLowerCase()) ||
          c.id.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, customers],
  );

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="size-3.5" /> Back to admin
        </Link>

        <header className="surface-card mb-4 rounded-3xl p-6">
          <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
            <Users className="size-7" /> Customer management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Profiles, order history, loyalty points, support & payment history.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className="surface-card rounded-3xl p-3">
            <div className="relative mb-3">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            {loading ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Loading…</p>
            ) : (
              <ul className="space-y-1">
                {list.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelected(c)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm transition",
                        selected?.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{c.name}</div>
                        <div className={cn("truncate text-[11px]", selected?.id === c.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {c.id} · {c.orders} orders
                        </div>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", TIER_TONE[c.tier])}>{c.tier}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selected && <CustomerDetail c={selected} />}
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({ c }: { c: Customer }) {
  return (
    <section className="space-y-4">
      <div className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-display text-2xl font-semibold">{c.name}</h2>
            <p className="text-muted-foreground mt-1 flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1"><Mail className="size-3" /> {c.email}</span>
              <span className="inline-flex items-center gap-1"><Phone className="size-3" /> {c.phone || "—"}</span>
            </p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", TIER_TONE[c.tier])}>{c.tier} member</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Orders" value={c.orders.toString()} />
          <Stat label="Total spend" value={formatBDT(c.spend)} />
          <Stat label="Loyalty points" value={c.points.toLocaleString()} icon={<Award className="size-3.5" />} />
          <Stat label="Support tickets" value={c.supportTickets.toString()} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Recent order history">
          <ol className="space-y-2 text-sm">
            {c.orders > 0 ? (
              <>
                <Row left={`${c.id.replace("CUST-", "DS-1")}0248 · 2 items`} right={formatBDT(Math.round(c.spend * 0.057))} />
                <Row left={`${c.id.replace("CUST-", "DS-1")}0241 · 1 item`} right={formatBDT(Math.round(c.spend * 0.015))} />
                <Row left={`${c.id.replace("CUST-", "DS-1")}0227 · 4 items`} right={formatBDT(Math.round(c.spend * 0.097))} />
                {c.orders > 3 && <Row left={`${c.id.replace("CUST-", "DS-1")}0219 · 1 item`} right={formatBDT(Math.round(c.spend * 0.028))} />}
              </>
            ) : (
              <li className="text-muted-foreground text-xs">No orders yet.</li>
            )}
          </ol>
        </Panel>
        <Panel title="Payment history">
          <ol className="space-y-2 text-sm">
            <Row left="bKash · TXN-77124" right={formatBDT(Math.round(c.spend * 0.057))} />
            <Row left="Card · VISA •••• 4421" right={formatBDT(Math.round(c.spend * 0.015))} />
            <Row left="Nagad · TXN-77098" right={formatBDT(Math.round(c.spend * 0.097))} />
            <Row left="COD" right={formatBDT(Math.round(c.spend * 0.028))} />
          </ol>
        </Panel>
        <Panel title="Loyalty points ledger">
          <ol className="space-y-2 text-sm">
            <Row left="Order +97" right="+97" tone="success" />
            <Row left="Birthday bonus" right="+200" tone="success" />
            <Row left="Redeemed voucher" right="-150" tone="warn" />
            <Row left="Order +164" right="+164" tone="success" />
          </ol>
        </Panel>
        <Panel title="Support history">
          <ol className="space-y-2 text-sm">
            {c.supportTickets > 0 ? (
              <>
                <Row left="#T-2104 · Delivery delay" right="Resolved" tone="success" />
                {c.supportTickets > 1 && <Row left="#T-2079 · Refund inquiry" right="Resolved" tone="success" />}
                {c.supportTickets > 2 && <Row left="#T-2031 · Invoice copy" right="Closed" />}
              </>
            ) : (
              <li className="text-muted-foreground text-xs">No support tickets.</li>
            )}
          </ol>
        </Panel>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Email customer</Button>
        <Button variant="hero" size="sm">Adjust points</Button>
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface-muted rounded-2xl p-3">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-display mt-1 inline-flex items-center gap-1 text-lg font-semibold">
        {icon}
        {value}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card rounded-3xl p-5">
      <h3 className="text-display mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Row({ left, right, tone }: { left: string; right: string; tone?: "success" | "warn" }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/40 pb-1.5 last:border-0">
      <span className="text-muted-foreground truncate">{left}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "success" && "text-emerald-700",
          tone === "warn" && "text-amber-700",
        )}
      >
        {right}
      </span>
    </li>
  );
}
