import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/email")({ component: EmailConfigPage });

function EmailConfigPage() {
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState({
    smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "",
    fromEmail: "", fromName: "Dadar Shop", useTls: true,
  });

  useEffect(() => {
    adminFetch<any>("email-config")
      .then(d => { if (d && !d.error) setCfg(p => ({ ...p, ...d, smtpPass: "" })); })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/email-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(cfg),
    });
    setSaving(false);
    if (res.ok) toast.success("Email config saved");
    else toast.error("Failed");
  }

  const F = ({ label, k, type = "text", placeholder = "" }: { label: string; k: keyof typeof cfg; type?: string; placeholder?: string }) => (
    <div>
      <Label className="text-sm mb-1 block">{label}</Label>
      <Input type={type} placeholder={placeholder} value={cfg[k] as string} onChange={e => setCfg(p => ({ ...p, [k]: e.target.value }))} />
    </div>
  );

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Mail className="size-7" /> Email Configuration</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure SMTP settings for outgoing emails.</p>
      </header>
      <div className="space-y-4">
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">SMTP Settings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="SMTP Host" k="smtpHost" placeholder="smtp.example.com" />
            <F label="SMTP Port" k="smtpPort" type="number" placeholder="587" />
            <F label="Username" k="smtpUser" placeholder="user@example.com" />
            <F label="Password" k="smtpPass" type="password" placeholder="••••••••" />
          </div>
          <div className="mt-3 flex items-center justify-between py-2">
            <div className="text-sm font-medium">Use TLS/STARTTLS</div>
            <button onClick={() => setCfg(p => ({ ...p, useTls: !p.useTls }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${cfg.useTls ? "bg-primary" : "bg-surface-muted"}`}>
              <span className={`inline-block size-4 rounded-full bg-white shadow transition ${cfg.useTls ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Sender Identity</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="From Email" k="fromEmail" type="email" placeholder="noreply@dadarshop.com" />
            <F label="From Name" k="fromName" placeholder="Dadar Shop" />
          </div>
        </div>
        <Button variant="hero" onClick={save} disabled={saving} className="w-full sm:w-auto"><Save className="size-4 mr-1" />{saving ? "Saving…" : "Save Config"}</Button>
      </div>
    </AdminLayout>
  );
}
