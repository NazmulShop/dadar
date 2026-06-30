import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Smartphone, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/otp")({ component: OTPConfigPage });

function OTPConfigPage() {
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState({
    smsProvider: "twilio", accountSid: "", authToken: "", fromNumber: "",
    otpLength: "6", otpExpiry: "300", rateLimitPerHour: "5",
  });

  useEffect(() => {
    adminFetch<any>("otp-config")
      .then(d => { if (d && !d.error) setCfg(p => ({ ...p, ...d, authToken: "" })); })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/otp-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(cfg),
    });
    setSaving(false);
    if (res.ok) toast.success("OTP config saved");
    else toast.error("Failed");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Smartphone className="size-7" /> OTP / SMS Config</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure SMS provider for OTP delivery.</p>
      </header>
      <div className="space-y-4">
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">SMS Provider</h3>
          <div className="mb-3">
            <Label className="text-sm mb-1 block">Provider</Label>
            <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={cfg.smsProvider} onChange={e => setCfg(p => ({ ...p, smsProvider: e.target.value }))}>
              <option value="twilio">Twilio</option>
              <option value="nexmo">Vonage (Nexmo)</option>
              <option value="sslwireless">SSL Wireless (BD)</option>
              <option value="infobip">Infobip</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-sm mb-1 block">Account SID / API Key</Label><Input value={cfg.accountSid} onChange={e => setCfg(p => ({ ...p, accountSid: e.target.value }))} placeholder="ACxxxxxxx" /></div>
            <div><Label className="text-sm mb-1 block">Auth Token / Secret</Label><Input type="password" value={cfg.authToken} onChange={e => setCfg(p => ({ ...p, authToken: e.target.value }))} placeholder="••••••••" /></div>
            <div><Label className="text-sm mb-1 block">From Number</Label><Input value={cfg.fromNumber} onChange={e => setCfg(p => ({ ...p, fromNumber: e.target.value }))} placeholder="+1234567890" /></div>
          </div>
        </div>
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">OTP Rules</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label className="text-sm mb-1 block">OTP Length</Label><Input type="number" value={cfg.otpLength} onChange={e => setCfg(p => ({ ...p, otpLength: e.target.value }))} placeholder="6" /></div>
            <div><Label className="text-sm mb-1 block">Expiry (seconds)</Label><Input type="number" value={cfg.otpExpiry} onChange={e => setCfg(p => ({ ...p, otpExpiry: e.target.value }))} placeholder="300" /></div>
            <div><Label className="text-sm mb-1 block">Rate limit (per hour)</Label><Input type="number" value={cfg.rateLimitPerHour} onChange={e => setCfg(p => ({ ...p, rateLimitPerHour: e.target.value }))} placeholder="5" /></div>
          </div>
        </div>
        <Button variant="hero" onClick={save} disabled={saving} className="w-full sm:w-auto"><Save className="size-4 mr-1" />{saving ? "Saving…" : "Save Config"}</Button>
      </div>
    </AdminLayout>
  );
}
