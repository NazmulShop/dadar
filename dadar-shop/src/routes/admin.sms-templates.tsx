import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Save } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { NOTIFICATION_TEMPLATES, NOTIFICATION_EVENT_LABEL } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sms-templates")({ component: SmsTemplatesPage });

function SmsTemplatesPage() {
  const [selected, setSelected] = useState(NOTIFICATION_TEMPLATES[0]?.event ?? "");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const tpl = NOTIFICATION_TEMPLATES.find(t => t.event === selected);
  useEffect(() => { if (tpl) setBody(tpl.sms ?? ""); }, [selected]);

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/sms-templates/${selected}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ body }),
    });
    setSaving(false);
    if (res.ok) toast.success("SMS template saved"); else toast.error("Save failed");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><MessageSquare className="size-7 text-emerald-600" /> SMS Templates</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage SMS notification templates for customers.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="surface-card rounded-3xl p-3">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground px-2 mb-2">Templates</h3>
          <ul className="space-y-1">
            {NOTIFICATION_TEMPLATES.map(t => (
              <li key={t.event}>
                <button onClick={() => setSelected(t.event)}
                  className={`w-full text-left rounded-2xl px-3 py-2 text-sm transition ${selected === t.event ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted"}`}>
                  {NOTIFICATION_EVENT_LABEL[t.event] ?? t.event}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface-card rounded-3xl p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-1">{tpl ? NOTIFICATION_EVENT_LABEL[tpl.event] : "—"}</h3>
            <p className="text-xs text-muted-foreground">Keep SMS under 160 characters for single-part delivery.</p>
          </div>
          <div>
            <textarea className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-32 resize-none font-mono"
              value={body} onChange={e => setBody(e.target.value)} maxLength={320} />
            <div className="text-right text-xs text-muted-foreground mt-1">{body.length} / 160 chars{body.length > 160 ? " (2 SMS)" : ""}</div>
          </div>
          <p className="text-muted-foreground text-xs">Variables: <code>{"{{name}}"}</code> <code>{"{{orderId}}"}</code> <code>{"{{total}}"}</code></p>
          <Button variant="hero" size="sm" onClick={save} disabled={saving}><Save className="size-4 mr-1" />{saving ? "Saving…" : "Save Template"}</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
