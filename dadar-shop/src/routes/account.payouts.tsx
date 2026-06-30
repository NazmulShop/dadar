import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Plus, Smartphone, Trash2, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/payouts")({
  head: () => ({
    meta: [
      { title: "Payout methods — Dadar Shop" },
      {
        name: "description",
        content:
          "Add and manage your bank account or mobile wallet (bKash, Nagad, Rocket, Upay) for refunds and payouts.",
      },
    ],
  }),
  component: PayoutsPage,
});

type Wallet = "bKash" | "Nagad" | "Rocket" | "Upay";
type Method =
  | { id: string; kind: "bank"; bankName: string; accountName: string; accountNumber: string; branch: string; isDefault?: boolean }
  | { id: string; kind: "wallet"; wallet: Wallet; number: string; isDefault?: boolean };

const WALLETS: { id: Wallet; color: string }[] = [
  { id: "bKash", color: "#E2136E" },
  { id: "Nagad", color: "#EB6E1F" },
  { id: "Rocket", color: "#8C2D8D" },
  { id: "Upay", color: "#0F766E" },
];

const API_ORIGIN = ((import.meta as any).env?.VITE_API_URL ?? "").replace(/\/$/, "");
const PAYOUT_API = `${API_ORIGIN}/api/account/payout-methods`;

function getToken(): string | null {
  try {
    const raw = window.localStorage.getItem("dadar.auth.session.v2");
    if (!raw) return null;
    const s = JSON.parse(raw) as { token?: string; expiresAt?: number };
    if (!s.token || (s.expiresAt && s.expiresAt < Date.now())) return null;
    return s.token;
  } catch {
    return null;
  }
}

async function apiCall<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${PAYOUT_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

function PayoutsPage() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"wallet" | "bank" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiCall<{ methods: Method[] }>("")
      .then((d) => setMethods(d.methods))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    setMethods((m) => m.filter((x) => x.id !== id));
    try {
      await apiCall(`/${id}`, { method: "DELETE" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove payout method");
      apiCall<{ methods: Method[] }>("").then((d) => setMethods(d.methods)).catch(() => {});
    }
  }

  async function setDefault(id: string) {
    setMethods((m) => m.map((x) => ({ ...x, isDefault: x.id === id })));
    try {
      await apiCall(`/${id}/default`, { method: "PATCH" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't set default payout method");
      apiCall<{ methods: Method[] }>("").then((d) => setMethods(d.methods)).catch(() => {});
    }
  }

  async function addMethod(body: Record<string, string>) {
    const data = await apiCall<{ method: Method }>("", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setMethods((p) => [...p, data.method]);
    setMode(null);
  }

  return (
    <div className="space-y-4">
      <header className="surface-card flex flex-col gap-2 rounded-3xl p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
            <WalletIcon className="size-6" /> Payout methods
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Refunds and earnings will be sent to your selected default.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode("wallet")}>
            <Smartphone className="size-4" /> Add mobile wallet
          </Button>
          <Button size="sm" variant="hero" onClick={() => setMode("bank")}>
            <Plus className="size-4" /> Add bank
          </Button>
        </div>
      </header>

      {error && (
        <div className="surface-card rounded-3xl p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {mode === "wallet" && (
        <WalletForm
          onCancel={() => setMode(null)}
          onAdd={(m) => addMethod({ kind: "wallet", wallet: m.wallet, number: m.number })}
        />
      )}
      {mode === "bank" && (
        <BankForm
          onCancel={() => setMode(null)}
          onAdd={(m) =>
            addMethod({
              kind: "bank",
              bankName: m.bankName,
              accountName: m.accountName,
              accountNumber: m.accountNumber,
              branch: m.branch,
            })
          }
        />
      )}

      <ul className="space-y-3">
        {loading && (
          <li className="surface-card rounded-3xl p-8 text-center text-sm text-muted-foreground">
            Loading…
          </li>
        )}
        {!loading && methods.length === 0 && (
          <li className="surface-card rounded-3xl p-8 text-center text-sm text-muted-foreground">
            No payout methods yet.
          </li>
        )}
        {methods.map((m) => (
          <li key={m.id} className="surface-card flex items-center justify-between gap-3 rounded-3xl p-4">
            <div className="flex min-w-0 items-center gap-3">
              {m.kind === "wallet" ? (
                <span
                  className="text-display flex size-10 items-center justify-center rounded-2xl text-[10px] font-bold text-white"
                  style={{ background: WALLETS.find((w) => w.id === m.wallet)?.color }}
                >
                  {m.wallet}
                </span>
              ) : (
                <span className="bg-surface-muted flex size-10 items-center justify-center rounded-2xl">
                  <Banknote className="size-5" />
                </span>
              )}
              <div className="min-w-0">
                {m.kind === "wallet" ? (
                  <>
                    <div className="truncate text-sm font-semibold">{m.wallet} · {m.number}</div>
                    <div className="text-muted-foreground text-[11px]">Mobile financial service</div>
                  </>
                ) : (
                  <>
                    <div className="truncate text-sm font-semibold">{m.bankName} · {m.accountNumber}</div>
                    <div className="text-muted-foreground text-[11px]">{m.accountName} · {m.branch}</div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.isDefault ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Default
                </span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setDefault(m.id)}>
                  Make default
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove(m.id)} aria-label="Remove">
                <Trash2 className="size-4 text-rose-600" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WalletForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (m: { kind: "wallet"; wallet: Wallet; number: string }) => Promise<void>;
}) {
  const [wallet, setWallet] = useState<Wallet>("bKash");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="surface-card space-y-3 rounded-3xl p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!number) return;
        setBusy(true);
        setErr("");
        try {
          await onAdd({ kind: "wallet", wallet, number });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-display text-sm font-semibold">Add mobile wallet</h3>
      <div className="flex flex-wrap gap-2">
        {WALLETS.map((w) => (
          <button
            type="button"
            key={w.id}
            onClick={() => setWallet(w.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              wallet === w.id ? "text-white" : "bg-surface-muted text-foreground",
            )}
            style={wallet === w.id ? { background: w.color } : undefined}
          >
            {w.id}
          </button>
        ))}
      </div>
      <Input
        placeholder="+8801XXX-XXXXXX"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        inputMode="tel"
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="hero" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function BankForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (m: { kind: "bank"; bankName: string; accountName: string; accountNumber: string; branch: string }) => Promise<void>;
}) {
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="surface-card grid gap-3 rounded-3xl p-5 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!bankName || !accountNumber) return;
        setBusy(true);
        setErr("");
        try {
          await onAdd({ kind: "bank", bankName, accountName, accountNumber, branch });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-display sm:col-span-2 text-sm font-semibold">Add bank account</h3>
      <Input placeholder="Bank name (e.g. BRAC Bank)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
      <Input placeholder="Account holder name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
      <Input placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
      <Input placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
      {err && <p className="text-xs text-destructive sm:col-span-2">{err}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="hero" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
