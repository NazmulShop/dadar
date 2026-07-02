import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Save, ShieldCheck } from "lucide-react";
import { adminFetch, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { NOTIFICATION_TEMPLATES, NOTIFICATION_EVENT_LABEL } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email-templates")({ component: EmailTemplatesPage });

type Overrides = Record<string, { subject: string | null; body: string | null }>;

interface SystemTemplate {
  event: string;
  label: string;
  subject: string;
  greeting: string;
  bodyText: string;
  footerNote: string;
  edited: boolean;
}

function EmailTemplatesPage() {
  const [tab, setTab] = useState<"notification" | "system">("system");

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Mail className="size-7 text-blue-600" /> Email Templates</h1>
        <p className="text-muted-foreground mt-1 text-sm">Edit the emails sent to customers via Brevo, and in-app notification copy.</p>
        <div className="mt-4 flex gap-1 p-1 bg-surface-muted rounded-2xl w-fit">
          <button onClick={() => setTab("system")}
            className={cn("rounded-xl px-4 py-1.5 text-xs font-medium transition", tab === "system" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
            System Emails (Brevo)
          </button>
          <button onClick={() => setTab("notification")}
            className={cn("rounded-xl px-4 py-1.5 text-xs font-medium transition", tab === "notification" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
            Notification Copy
          </button>
        </div>
      </header>
      {tab === "system" ? <SystemEmailsTab /> : <NotificationEmailsTab />}
    </AdminLayout>
  );
}

/* ---------------------------- System (Brevo) ----------------------------- */

function SystemEmailsTab() {
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("register_otp");
  const [form, setForm] = useState({ subject: "", greeting: "", bodyText: "", footerNote: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    adminFetch<SystemTemplate[]>("system-email-templates")
      .then(d => { if (Array.isArray(d)) setTemplates(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const current = templates.find(t => t.event === selected);
  useEffect(() => {
    if (current) setForm({ subject: current.subject, greeting: current.greeting, bodyText: current.bodyText, footerNote: current.footerNote });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, templates.length]);

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/system-email-templates/${selected}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Live email template updated");
      load();
    } else toast.error("Save failed");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="surface-card rounded-3xl p-3">
        <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground px-2 mb-2 flex items-center gap-1">
          <ShieldCheck className="size-3.5" /> Live emails sent by Brevo
        </h3>
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-6">Loading…</p>
        ) : (
          <ul className="space-y-1">
            {templates.map(t => (
              <li key={t.event}>
                <button onClick={() => setSelected(t.event)}
                  className={cn("w-full text-left rounded-2xl px-3 py-2 text-sm transition", selected === t.event ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted")}>
                  {t.label}
                  {t.edited && <span className="ml-1.5 text-[9px] opacity-70">(edited)</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="surface-card rounded-3xl p-5 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 text-xs text-amber-800">
          These are the actual emails delivered to customers through Brevo — changes here take effect on the next send, no deploy needed.
        </div>
        <div><Label>Subject</Label><Input className="mt-1" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
        <div><Label>Title / greeting</Label><Input className="mt-1" value={form.greeting} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))} /></div>
        <div>
          <Label>Body text</Label>
          <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-24 resize-none"
            value={form.bodyText} onChange={e => setForm(f => ({ ...f, bodyText: e.target.value }))} />
        </div>
        <div>
          <Label>Footer note</Label>
          <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-16 resize-none"
            value={form.footerNote} onChange={e => setForm(f => ({ ...f, footerNote: e.target.value }))} />
        </div>
        <p className="text-muted-foreground text-xs">Variable: <code>{"{{name}}"}</code>. The verification code and expiry countdown are generated automatically and always appear below the body text.</p>
        <Button variant="hero" size="sm" onClick={save} disabled={saving}><Save className="size-4 mr-1" />{saving ? "Saving…" : "Save & Go Live"}</Button>
      </div>
    </div>
  );
}

/* ------------------------------ Notification ------------------------------ */

function NotificationEmailsTab() {
  const [selected, setSelected] = useState(NOTIFICATION_TEMPLATES[0]?.event ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [loaded, setLoaded] = useState(false);

  const tpl = NOTIFICATION_TEMPLATES.find(t => t.event === selected);

  useEffect(() => {
    adminFetch<Overrides>("email-templates")
      .then(d => { if (d && typeof d === "object") setOverrides(d); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const override = overrides[selected];
    setSubject(override?.subject ?? tpl?.subject ?? "");
    setBody(override?.body ?? tpl?.email ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, loaded]);

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/email-templates/${selected}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ subject, body }),
    });
    setSaving(false);
    if (res.ok) {
      setOverrides(o => ({ ...o, [selected]: { subject, body } }));
      toast.success("Template saved");
    } else toast.error("Save failed");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="surface-card rounded-3xl p-3">
        <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground px-2 mb-2">In-app notification copy</h3>
        <ul className="space-y-1">
          {NOTIFICATION_TEMPLATES.map(t => (
            <li key={t.event}>
              <button onClick={() => setSelected(t.event)}
                className={cn("w-full text-left rounded-2xl px-3 py-2 text-sm transition", selected === t.event ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted")}>
                {NOTIFICATION_EVENT_LABEL[t.event] ?? t.event}
                {overrides[t.event] && <span className="ml-1.5 text-[9px] opacity-70">(edited)</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="surface-card rounded-3xl p-5 space-y-4">
        <div className="bg-surface-muted rounded-2xl px-3 py-2 text-xs text-muted-foreground">
          This text drives the customer's in-app notification feed for this event, not a Brevo email.
        </div>
        <div>
          <h3 className="font-semibold text-sm mb-1">{tpl ? NOTIFICATION_EVENT_LABEL[tpl.event] : "—"}</h3>
          <code className="text-[10px] text-muted-foreground bg-surface-muted rounded-full px-2 py-0.5">{selected}</code>
        </div>
        <div><Label>Subject</Label><Input className="mt-1" value={subject} onChange={e => setSubject(e.target.value)} /></div>
        <div>
          <Label>Body</Label>
          <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-48 resize-none font-mono"
            value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <p className="text-muted-foreground text-xs">Variables: <code>{"{{name}}"}</code> <code>{"{{orderId}}"}</code> <code>{"{{total}}"}</code> <code>{"{{status}}"}</code></p>
        <Button variant="hero" size="sm" onClick={save} disabled={saving}><Save className="size-4 mr-1" />{saving ? "Saving…" : "Save Template"}</Button>
      </div>
    </div>
  );
}
