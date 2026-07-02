import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Smartphone, Send } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/push-notifications")({ component: PushNotificationsPage });

function PushNotificationsPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", target: "all", url: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    adminFetch("push-notifications").then(d => { if (Array.isArray(d)) setHistory(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function send() {
    if (!form.title || !form.body) { toast.error("Title and body required"); return; }
    setSending(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/push-notifications/send`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (res.ok) {
      const d = await res.json();
      setHistory(h => [d, ...h]);
      toast.success("Push notification sent!"); setForm({ title: "", body: "", target: "all", url: "" });
    } else toast.error("Failed to send");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Smartphone className="size-7 text-violet-600" /> Push Notifications</h1>
        <p className="text-muted-foreground mt-1 text-sm">Send push notifications to customers' devices.</p>
      </header>

      <div className="surface-card rounded-3xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-4">Send Push Notification</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input className="mt-1" placeholder="New products available!" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><Label>Target Audience</Label>
            <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
              <option value="all">All Users</option>
              <option value="active">Active Users</option>
              <option value="vip">VIP Customers</option>
            </select>
          </div>
          <div className="sm:col-span-2"><Label>Message</Label><Input className="mt-1" placeholder="Check out our latest arrivals…" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Deep Link URL (optional)</Label><Input className="mt-1" placeholder="/shop/electronics" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
        </div>
        <Button variant="hero" size="sm" className="mt-4" onClick={send} disabled={sending}>
          <Send className="size-4 mr-1" />{sending ? "Sending…" : "Send Push"}
        </Button>
      </div>

      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">Recent Push Notifications</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : history.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No push notifications sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map(n => (
              <li key={n.id} className="border border-border rounded-2xl p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{n.body}</div>
                  <div className="text-muted-foreground text-[10px] mt-1">{n.target} · {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{n.sentCount ?? 0} sent</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
