import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/currency")({ component: CurrencyPage });

function CurrencyPage() {
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState({
    currency: "BDT", currencySymbol: "৳", currencyPosition: "before",
    taxRate: "0", taxLabel: "VAT", includesTax: false,
  });

  useEffect(() => {
    adminFetch<any>("settings")
      .then(d => { if (d && !d.error) setCfg(p => ({ ...p, ...d })); })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(cfg),
    });
    setSaving(false);
    if (res.ok) toast.success("Currency settings saved");
    else toast.error("Failed to save");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><DollarSign className="size-7" /> Currency & Tax</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure currency display and tax settings.</p>
      </header>
      <div className="space-y-4">
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Currency Settings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-sm mb-1 block">Currency Code</Label><Input value={cfg.currency} onChange={e => setCfg(p => ({ ...p, currency: e.target.value }))} placeholder="BDT" /></div>
            <div><Label className="text-sm mb-1 block">Symbol</Label><Input value={cfg.currencySymbol} onChange={e => setCfg(p => ({ ...p, currencySymbol: e.target.value }))} placeholder="৳" /></div>
            <div>
              <Label className="text-sm mb-1 block">Symbol Position</Label>
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={cfg.currencyPosition} onChange={e => setCfg(p => ({ ...p, currencyPosition: e.target.value }))}>
                <option value="before">Before amount (৳100)</option>
                <option value="after">After amount (100৳)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Tax Settings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-sm mb-1 block">Tax Rate (%)</Label><Input type="number" value={cfg.taxRate} onChange={e => setCfg(p => ({ ...p, taxRate: e.target.value }))} placeholder="0" /></div>
            <div><Label className="text-sm mb-1 block">Tax Label</Label><Input value={cfg.taxLabel} onChange={e => setCfg(p => ({ ...p, taxLabel: e.target.value }))} placeholder="VAT" /></div>
          </div>
          <div className="mt-3 flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Prices include tax</div>
              <div className="text-xs text-muted-foreground">Display prices as tax-inclusive</div>
            </div>
            <button onClick={() => setCfg(p => ({ ...p, includesTax: !p.includesTax }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${cfg.includesTax ? "bg-primary" : "bg-surface-muted"}`}>
              <span className={`inline-block size-4 rounded-full bg-white shadow transition ${cfg.includesTax ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
        <Button variant="hero" onClick={save} disabled={saving} className="w-full sm:w-auto"><Save className="size-4 mr-1" />{saving ? "Saving…" : "Save"}</Button>
      </div>
    </AdminLayout>
  );
}
