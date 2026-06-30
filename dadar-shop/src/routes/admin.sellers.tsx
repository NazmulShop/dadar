import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Percent, Store, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBDT } from "@/data/account";
import { API_ORIGIN } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/sellers")({
  component: SellersPage,
});

interface Seller {
  id: string;
  shop: string;
  owner: string;
  status: "Pending" | "Active" | "Suspended";
  products: number;
  sales: number;
  earnings: number;
  commission: number;
  pendingPayout: number;
}

const TONE: Record<Seller["status"], string> = {
  Pending: "bg-amber-100 text-amber-800",
  Active: "bg-emerald-100 text-emerald-800",
  Suspended: "bg-rose-100 text-rose-800",
};

type Tab = "sellers" | "register" | "commissions" | "withdrawals";

/**
 * Reads the bearer token out of the JSON-serialized session stored by
 * authStore.tsx. Module-level helpers (not React components/hooks) can't
 * call useAuth(), so this mirrors what AuthProvider stores under the hood.
 */
function getStoredToken(): string | undefined {
  try {
    const raw = localStorage.getItem("dadar.auth.session.v2");
    if (!raw) return undefined;
    return (JSON.parse(raw) as { token?: string })?.token;
  } catch {
    return undefined;
  }
}

async function apiPut(path: string, body: object) {
  const token = getStoredToken();
  const res = await fetch(`${API_ORIGIN}/api/admin/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res;
}

async function apiPost(path: string, body: object) {
  const token = getStoredToken();
  const res = await fetch(`${API_ORIGIN}/api/admin/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res;
}

function useSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    fetch(`${API_ORIGIN}/api/admin/sellers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setSellers(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { sellers, setSellers, loading };
}

function SellersPage() {
  const [tab, setTab] = useState<Tab>("sellers");
  const { sellers, setSellers, loading } = useSellers();

  function approve(id: string) {
    setSellers((s) => s.map((x) => (x.id === id ? { ...x, status: "Active" } : x)));
    apiPut(`sellers/${id}/status`, { status: "Active" }).catch(() => {
      toast.error("Couldn't approve seller");
      setSellers((s) => s.map((x) => (x.id === id ? { ...x, status: "Pending" } : x)));
    });
  }
  function suspend(id: string) {
    setSellers((s) => s.map((x) => (x.id === id ? { ...x, status: "Suspended" } : x)));
    apiPut(`sellers/${id}/status`, { status: "Suspended" }).catch(() => {
      toast.error("Couldn't suspend seller");
      setSellers((s) => s.map((x) => (x.id === id ? { ...x, status: "Active" } : x)));
    });
  }
  function updateCommission(id: string, c: number) {
    const prev = sellers.find((x) => x.id === id)?.commission;
    setSellers((s) => s.map((x) => (x.id === id ? { ...x, commission: c } : x)));
    apiPut(`sellers/${id}/commission`, { commission: c }).catch(() => {
      toast.error("Couldn't update commission");
      if (prev !== undefined) setSellers((s) => s.map((x) => (x.id === id ? { ...x, commission: prev } : x)));
    });
  }
  function releasePayout(id: string) {
    const prev = sellers.find((x) => x.id === id)?.pendingPayout;
    setSellers((s) => s.map((x) => (x.id === id ? { ...x, pendingPayout: 0 } : x)));
    apiPost(`sellers/${id}/payout`, {}).catch(() => {
      toast.error("Couldn't release payout");
      if (prev !== undefined) setSellers((s) => s.map((x) => (x.id === id ? { ...x, pendingPayout: prev } : x)));
    });
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "sellers", label: "Sellers" },
    { id: "register", label: "Registration" },
    { id: "commissions", label: "Commissions" },
    { id: "withdrawals", label: "Withdrawals" },
  ];

  return (
    <AdminLayout>
      <header className="surface-card mb-4 flex flex-col gap-3 rounded-3xl p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
            <Store className="size-7" /> Multi-vendor marketplace
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage sellers, registrations, commissions and payouts.
          </p>
        </div>
        <Button variant="hero" size="sm" asChild>
          <Link to="/seller">Open seller portal</Link>
        </Button>
      </header>

      <nav className="surface-card -mx-1 mb-4 flex gap-1 overflow-x-auto rounded-3xl p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition",
              tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading && (
        <div className="surface-card rounded-3xl p-12 text-center">
          <p className="text-muted-foreground text-sm">Loading sellers…</p>
        </div>
      )}

      {!loading && tab === "sellers" && (
          <section className="surface-card overflow-hidden rounded-3xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-muted-foreground text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Seller</th>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Sales</th>
                  <th>Earnings</th>
                  <th>Commission</th>
                  <th className="text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr key={s.id} className="border-border border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{s.shop}</div>
                      <div className="text-muted-foreground text-[11px]">{s.id} · {s.owner}</div>
                    </td>
                    <td><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", TONE[s.status])}>{s.status}</span></td>
                    <td>{s.products}</td>
                    <td>{s.sales}</td>
                    <td className="font-semibold">{formatBDT(s.earnings)}</td>
                    <td>{s.commission}%</td>
                    <td className="pr-4 text-right">
                      {s.status === "Pending" && (
                        <Button size="sm" variant="hero" onClick={() => approve(s.id)}>
                          <CheckCircle2 className="size-3.5" /> Approve
                        </Button>
                      )}
                      {s.status === "Active" && (
                        <Button size="sm" variant="outline" onClick={() => suspend(s.id)}>Suspend</Button>
                      )}
                      {s.status === "Suspended" && (
                        <Button size="sm" variant="outline" onClick={() => approve(s.id)}>Reactivate</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {!loading && tab === "register" && <RegistrationForm />}

        {!loading && tab === "commissions" && (
          <section className="surface-card rounded-3xl p-5">
            <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
              <Percent className="size-4" /> Commission management
            </h3>
            <ul className="space-y-2">
              {sellers.map((s) => (
                <li key={s.id} className="bg-surface-muted flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold">{s.shop}</div>
                    <div className="text-muted-foreground text-[11px]">{s.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={s.commission}
                      onChange={(e) => updateCommission(s.id, Number(e.target.value))}
                      className="bg-background h-8 w-20 rounded-lg border border-border px-2 text-sm tabular-nums"
                    />
                    <span className="text-xs">%</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!loading && tab === "withdrawals" && (
          <section className="surface-card rounded-3xl p-5">
            <h3 className="text-display mb-3 flex items-center gap-2 text-sm font-semibold">
              <Wallet className="size-4" /> Pending withdrawals
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground text-[11px] uppercase">
                <tr><th className="py-2">Seller</th><th>Method</th><th>Amount</th><th className="text-right">Action</th></tr>
              </thead>
              <tbody>
                {sellers.filter((s) => s.pendingPayout > 0).map((s) => (
                  <tr key={s.id} className="border-border border-t">
                    <td className="py-2 font-medium">{s.shop}</td>
                    <td className="text-muted-foreground">bKash · +880171XXXX</td>
                    <td className="font-semibold">{formatBDT(s.pendingPayout)}</td>
                    <td className="text-right">
                      <Button size="sm" variant="hero" onClick={() => releasePayout(s.id)}>Release</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-muted-foreground mt-4 inline-flex items-center gap-1 text-xs">
              <TrendingUp className="size-3.5" /> Total queued: {formatBDT(sellers.reduce((a, s) => a + s.pendingPayout, 0))}
            </div>
          </section>
        )}
    </AdminLayout>
  );
}

function RegistrationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ shop: "", owner: "", email: "", phone: "", tradeLicense: "", nid: "", address: "" });

  if (submitted) {
    return (
      <div className="surface-card rounded-3xl p-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 size-10 text-emerald-600" />
        <h3 className="text-display text-lg font-semibold">Application received</h3>
        <p className="text-muted-foreground mt-1 text-sm">We&apos;ll review the shop and notify you within 48 hours.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setSubmitted(false)}>Submit another</Button>
      </div>
    );
  }
  return (
    <form
      className="surface-card grid gap-3 rounded-3xl p-6 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
          const token = getStoredToken();
          const res = await fetch(`${API_ORIGIN}/api/admin/sellers/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(form),
          });
          if (!res.ok) throw new Error(`Request failed (${res.status})`);
          setSubmitted(true);
        } catch {
          toast.error("Registration failed. Please try again.");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <h3 className="text-display sm:col-span-2 text-sm font-semibold">Seller registration</h3>
      <Input placeholder="Shop name" required value={form.shop} onChange={e => setForm(f => ({ ...f, shop: e.target.value }))} />
      <Input placeholder="Owner full name" required value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
      <Input placeholder="Email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      <Input placeholder="Phone" inputMode="tel" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      <Input placeholder="Trade license #" value={form.tradeLicense} onChange={e => setForm(f => ({ ...f, tradeLicense: e.target.value }))} />
      <Input placeholder="NID / Passport #" value={form.nid} onChange={e => setForm(f => ({ ...f, nid: e.target.value }))} />
      <Input className="sm:col-span-2" placeholder="Warehouse address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="submit" variant="hero" size="sm" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </form>
  );
}
