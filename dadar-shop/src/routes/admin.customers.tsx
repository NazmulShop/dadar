import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Award, BadgeCheck, Mail, Phone, Search, ShieldCheck, Store, Users } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { formatBDT } from "@/data/account";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/adminApi";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isSeller: boolean;
  tier: "Silver" | "Gold" | "Platinum";
  orders: number;
  spend: number;
  points: number;
  supportTickets: number;
  lastOrder: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  seller: { id: string; shop: string; status: string; products: number; sales: number; commission: number } | null;
}

interface DetailOrder {
  id: string;
  status: string;
  total: number;
  placedAt: string;
}

interface DetailPayment {
  orderId: string;
  method: string;
  amount: number;
  paymentStatus: string;
  placedAt: string;
}

interface DetailTicket {
  id: string;
  subject: string;
  status: string;
  category: string;
  createdAt: string;
}

interface CustomerDetailResponse {
  user: Customer & { createdAt: string };
  seller: any | null;
  orders: DetailOrder[];
  payments: DetailPayment[];
  supportTickets: DetailTicket[];
}

const TIER_TONE: Record<Customer["tier"], string> = {
  Silver: "bg-slate-100 text-slate-700",
  Gold: "bg-amber-100 text-amber-800",
  Platinum: "bg-violet-100 text-violet-800",
};

function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<Customer[]>("customers")
      .then((d) => { if (Array.isArray(d)) setCustomers(d); })
      .finally(() => setLoading(false));
  }, []);

  return { customers, loading };
}

function CustomersPage() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | "Users" | "Sellers">("All");
  const { customers, loading } = useCustomers();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (customers.length > 0 && !selectedId) setSelectedId(customers[0].id);
  }, [customers, selectedId]);

  const list = useMemo(
    () =>
      customers.filter((c) => {
        const mQ =
          !q ||
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.email.toLowerCase().includes(q.toLowerCase()) ||
          c.id.toLowerCase().includes(q.toLowerCase());
        const mRole = roleFilter === "All" || (roleFilter === "Sellers" ? c.isSeller : !c.isSeller);
        return mQ && mRole;
      }),
    [q, roleFilter, customers],
  );

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
          <Users className="size-7" /> Users
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every buyer and seller registered on the storefront — tap a profile for full registration details.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="surface-card rounded-3xl p-3">
          <div className="relative mb-2">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="mb-3 flex gap-1">
            {(["All", "Users", "Sellers"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "rounded-2xl px-3 py-1.5 text-xs font-medium transition",
                  roleFilter === r ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No users found.</p>
          ) : (
            <ul className="space-y-1">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm transition",
                      selectedId === c.id ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate font-semibold">
                        {c.name}
                        {c.isSeller && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                            <Store className="size-2.5" /> SELLER
                          </span>
                        )}
                      </div>
                      <div className={cn("truncate text-[11px]", selectedId === c.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {c.email} · {c.orders} orders
                      </div>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", TIER_TONE[c.tier])}>{c.tier}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selected && <CustomerDetail customer={selected} />}
      </div>
    </AdminLayout>
  );
}

function CustomerDetail({ customer }: { customer: Customer }) {
  const [detail, setDetail] = useState<CustomerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    adminFetch<CustomerDetailResponse>(`customers/${customer.id}/detail`)
      .then((d) => setDetail(d))
      .finally(() => setLoading(false));
  }, [customer.id]);

  return (
    <section className="space-y-4">
      <div className="surface-card rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-display flex items-center gap-2 text-2xl font-semibold">
              {customer.name}
              {customer.isSeller && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  <Store className="size-3" /> Seller
                </span>
              )}
            </h2>
            <p className="text-muted-foreground mt-1 flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1"><Mail className="size-3" /> {customer.email} {customer.emailVerified && <BadgeCheck className="size-3 text-emerald-600" />}</span>
              <span className="inline-flex items-center gap-1"><Phone className="size-3" /> {customer.phone || "—"} {customer.phoneVerified && <BadgeCheck className="size-3 text-emerald-600" />}</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3" /> Account: {customer.status}</span>
            </p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", TIER_TONE[customer.tier])}>{customer.tier} member</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Orders" value={customer.orders.toString()} />
          <Stat label="Total spend" value={formatBDT(customer.spend)} />
          <Stat label="Loyalty points" value={customer.points.toLocaleString()} icon={<Award className="size-3.5" />} />
          <Stat label="Support tickets" value={customer.supportTickets.toString()} />
        </div>
      </div>

      {customer.isSeller && customer.seller && (
        <div className="surface-card rounded-3xl p-5">
          <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold"><Store className="size-4" /> Seller registration details</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Shop name" value={customer.seller.shop} />
            <Stat label="Seller status" value={customer.seller.status} />
            <Stat label="Products listed" value={customer.seller.products.toString()} />
            <Stat label="Commission" value={`${customer.seller.commission}%`} />
          </div>
        </div>
      )}

      {loading && (
        <div className="surface-card rounded-3xl p-5 text-center text-muted-foreground text-sm">Loading user history…</div>
      )}

      {!loading && detail && (
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Order history">
            <ol className="space-y-2 text-sm">
              {detail.orders.length === 0 ? (
                <li className="text-muted-foreground text-xs">No orders yet.</li>
              ) : (
                detail.orders.slice(0, 8).map((o) => (
                  <Row key={o.id} left={`${o.id} · ${o.status}`} right={formatBDT(o.total)} />
                ))
              )}
            </ol>
          </Panel>
          <Panel title="Payment history">
            <ol className="space-y-2 text-sm">
              {detail.payments.length === 0 ? (
                <li className="text-muted-foreground text-xs">No payments yet.</li>
              ) : (
                detail.payments.slice(0, 8).map((p) => (
                  <Row
                    key={p.orderId}
                    left={`${p.method} · ${p.orderId}`}
                    right={formatBDT(p.amount)}
                    tone={p.paymentStatus === "Successful" ? "success" : p.paymentStatus === "Failed" ? "warn" : undefined}
                  />
                ))
              )}
            </ol>
          </Panel>
          <Panel title="Support history">
            <ol className="space-y-2 text-sm">
              {detail.supportTickets.length === 0 ? (
                <li className="text-muted-foreground text-xs">No support tickets.</li>
              ) : (
                detail.supportTickets.slice(0, 8).map((t) => (
                  <Row key={t.id} left={`#${t.id.slice(0, 8)} · ${t.subject}`} right={t.status} tone={t.status === "resolved" ? "success" : undefined} />
                ))
              )}
            </ol>
          </Panel>
          <Panel title="Registration info">
            <ol className="space-y-2 text-sm">
              <Row left="Registered" right={detail.user.createdAt ? new Date(detail.user.createdAt).toLocaleDateString() : "—"} />
              <Row left="Role" right={detail.user.role} />
              <Row left="Email verified" right={customer.emailVerified ? "Yes" : "No"} tone={customer.emailVerified ? "success" : "warn"} />
              <Row left="Phone verified" right={customer.phoneVerified ? "Yes" : "No"} tone={customer.phoneVerified ? "success" : "warn"} />
            </ol>
          </Panel>
        </div>
      )}
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
          "font-semibold tabular-nums shrink-0",
          tone === "success" && "text-emerald-700",
          tone === "warn" && "text-amber-700",
        )}
      >
        {right}
      </span>
    </li>
  );
}
