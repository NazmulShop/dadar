import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gift, Plus, Copy } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBDT } from "@/data/account";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/gift-cards")({ component: GiftCardsPage });

function GiftCardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", recipientEmail: "", message: "", expiresAt: "" });

  useEffect(() => {
    adminFetch("gift-cards")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setCards(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function issue() {
    if (!form.amount) { toast.error("Amount required"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/gift-cards`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    if (res.ok) { const d = await res.json(); setCards(c => [d, ...c]); toast.success("Gift card issued!"); setShowForm(false); setForm({ amount: "", recipientEmail: "", message: "", expiresAt: "" }); }
    else toast.error("Failed");
  }

  const totalIssued = cards.reduce((s, c) => s + (c.amount ?? 0), 0);
  const totalUsed = cards.reduce((s, c) => s + (c.usedAmount ?? 0), 0);

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Gift className="size-7 text-rose-500" /> Gift Cards</h1>
            <p className="text-muted-foreground mt-1 text-sm">Issue and manage digital gift cards for customers.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}><Plus className="size-4" /> Issue Gift Card</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Issued</div><div className="text-display mt-1 text-2xl font-semibold text-primary">{formatBDT(totalIssued)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total Redeemed</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{formatBDT(totalUsed)}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Cards Issued</div><div className="text-display mt-1 text-2xl font-semibold">{cards.length}</div></div>
      </div>

      {showForm && (
        <div className="surface-card rounded-3xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-4">Issue Gift Card</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Amount (৳)</Label><Input className="mt-1" type="number" placeholder="500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>Recipient Email</Label><Input className="mt-1" type="email" placeholder="customer@email.com" value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))} /></div>
            <div><Label>Expires At</Label><Input className="mt-1" type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
            <div><Label>Message (optional)</Label><Input className="mt-1" placeholder="Happy Birthday!" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 mt-4"><Button variant="hero" size="sm" onClick={issue}>Issue Card</Button><Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}

      <div className="surface-card rounded-3xl p-5">
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : cards.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No gift cards issued yet.</p>
        ) : (
          <div className="space-y-3">
            {cards.map(c => (
              <div key={c.id} className="border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{c.code}</span>
                    <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}><Copy className="size-3.5 text-muted-foreground hover:text-foreground" /></button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.recipientEmail ?? "—"} {c.expiresAt ? `· Expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatBDT(c.amount ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">{formatBDT(c.usedAmount ?? 0)} used</div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    c.status === "active" ? "bg-emerald-100 text-emerald-800" :
                    c.status === "used" ? "bg-surface-muted text-muted-foreground" : "bg-rose-100 text-rose-800")}>
                    {c.status ?? "active"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
