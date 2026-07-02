import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shield, Save, Eye, EyeOff } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/security")({ component: SecurityPage });

function SecurityPage() {
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [settings, setSettings] = useState({
    twoFactorEnabled: false, loginAttemptLimit: "5", lockoutDuration: "30",
    sessionTimeout: "720", requireStrongPassword: true, ipWhitelist: "",
    adminEmailNotifications: true, autoLogoutInactive: true,
  });
  const [passwords, setPasswords] = useState({ current: "", newPwd: "", confirm: "" });

  useEffect(() => {
    adminFetch("security-settings").then(d => { if (d && !d.error) setSettings(s => ({ ...s, ...d })); })
      .catch(() => {});
  }, []);

  async function saveSettings() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/security-settings`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) toast.success("Security settings saved"); else toast.error("Failed");
  }

  async function changePassword() {
    if (!passwords.current || !passwords.newPwd) { toast.error("Fill all fields"); return; }
    if (passwords.newPwd !== passwords.confirm) { toast.error("Passwords don't match"); return; }
    if (passwords.newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const res = await fetch(`${API_ORIGIN}/api/admin/change-password`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPwd }),
    });
    if (res.ok) { toast.success("Password changed"); setPasswords({ current: "", newPwd: "", confirm: "" }); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Shield className="size-7 text-violet-600" /> Security Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure login security, sessions and admin access controls.</p>
      </header>

      <div className="space-y-4">
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Login & Session Security</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Max Login Attempts</Label><Input className="mt-1" type="number" value={settings.loginAttemptLimit} onChange={e => setSettings(s => ({ ...s, loginAttemptLimit: e.target.value }))} /></div>
            <div><Label>Lockout Duration (minutes)</Label><Input className="mt-1" type="number" value={settings.lockoutDuration} onChange={e => setSettings(s => ({ ...s, lockoutDuration: e.target.value }))} /></div>
            <div><Label>Session Timeout (minutes)</Label><Input className="mt-1" type="number" value={settings.sessionTimeout} onChange={e => setSettings(s => ({ ...s, sessionTimeout: e.target.value }))} /></div>
            <div><Label>IP Whitelist (comma separated)</Label><Input className="mt-1" placeholder="192.168.1.1, 10.0.0.0/8" value={settings.ipWhitelist} onChange={e => setSettings(s => ({ ...s, ipWhitelist: e.target.value }))} /></div>
          </div>

          <div className="mt-4 space-y-3">
            {([
              ["twoFactorEnabled", "Two-Factor Authentication (2FA)", "Require 2FA for all admin accounts"],
              ["requireStrongPassword", "Strong Password Policy", "Enforce min 8 chars, uppercase, number, symbol"],
              ["adminEmailNotifications", "Login Email Notifications", "Email admin on new login"],
              ["autoLogoutInactive", "Auto-logout Inactive Sessions", "Log out after session timeout"],
            ] as [keyof typeof settings, string, string][]).map(([k, label, desc]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
                <button onClick={() => setSettings(s => ({ ...s, [k]: !s[k] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings[k] ? "bg-primary" : "bg-surface-muted"}`}>
                  <span className={`inline-block size-4 rounded-full bg-white shadow transition ${settings[k] ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="hero" size="sm" className="mt-4" onClick={saveSettings} disabled={saving}><Save className="size-4 mr-1" />{saving ? "Saving…" : "Save Security Settings"}</Button>
        </div>

        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Change Admin Password</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Current Password</Label>
              <div className="relative mt-1">
                <Input type={showPwd ? "text" : "password"} value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
                <button onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
            </div>
            <div><Label>New Password</Label><Input className="mt-1" type="password" value={passwords.newPwd} onChange={e => setPasswords(p => ({ ...p, newPwd: e.target.value }))} /></div>
            <div><Label>Confirm Password</Label><Input className="mt-1" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} /></div>
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={changePassword}>Change Password</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
