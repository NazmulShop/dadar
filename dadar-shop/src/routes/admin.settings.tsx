import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Settings, Save } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    shopName: "Dadar Shop", shopEmail: "admin@dadarshop.com", shopPhone: "+880 1700 000000",
    shopAddress: "Dhaka, Bangladesh", currency: "BDT", timezone: "Asia/Dhaka",
    taxRate: "0", orderPrefix: "DS-", minOrderAmount: "0",
    maintenanceMode: false, allowGuestCheckout: true, emailNotifications: true,
  });

  useEffect(() => {
    adminFetch("settings")
      .then(r => r.json()).then(d => { if (d && !d.error) setSettings(s => ({ ...s, ...d })); })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) toast.success("Settings saved"); else toast.error("Failed to save");
  }

  const F = ({ label, k, type = "text", placeholder = "" }: { label: string; k: keyof typeof settings; type?: string; placeholder?: string }) => (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" type={type} placeholder={placeholder}
        value={settings[k] as string}
        onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))} />
    </div>
  );

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Settings className="size-7" /> Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure your shop settings.</p>
      </header>

      <div className="space-y-4">
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Shop Information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Shop Name" k="shopName" />
            <F label="Email" k="shopEmail" type="email" />
            <F label="Phone" k="shopPhone" />
            <F label="Address" k="shopAddress" />
          </div>
        </div>

        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Commerce Settings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Currency" k="currency" placeholder="BDT" />
            <F label="Timezone" k="timezone" placeholder="Asia/Dhaka" />
            <F label="Tax Rate (%)" k="taxRate" type="number" placeholder="0" />
            <F label="Order ID Prefix" k="orderPrefix" placeholder="DS-" />
            <F label="Min Order Amount (৳)" k="minOrderAmount" type="number" />
          </div>
        </div>

        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Features</h3>
          <div className="space-y-3">
            {([
              ["maintenanceMode", "Maintenance Mode", "Put the store in maintenance mode"],
              ["allowGuestCheckout", "Guest Checkout", "Allow checkout without account"],
              ["emailNotifications", "Email Notifications", "Send email notifications for orders"],
            ] as [keyof typeof settings, string, string][]).map(([k, label, desc]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <button onClick={() => setSettings(s => ({ ...s, [k]: !s[k] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings[k] ? "bg-primary" : "bg-surface-muted"}`}>
                  <span className={`inline-block size-4 rounded-full bg-white shadow transition ${settings[k] ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button variant="hero" onClick={save} disabled={saving} className="w-full sm:w-auto">
          <Save className="size-4 mr-1" />{saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </AdminLayout>
  );
}
