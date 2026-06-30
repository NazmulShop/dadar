import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Send, CheckCircle2, Trash2 } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", target: "all", type: "info" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    adminFetch("notifications")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setNotifs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function send() {
    if (!form.title || !form.body) { toast.error("Title and body required"); return; }
    setSending(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/notifications/broadcast`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (res.ok) { toast.success("Notification sent!"); setForm({ title: "", body: "", target: "all", type: "info" }); }
    else toast.error("Failed to send");
  }

  const TYPE_COLOR: Record<string, string> = {
    info: "bg-blue-100 text-blue-800",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    error: "bg-rose-100 text-rose-800",
  };

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Bell className="size-7" /> Notifications</h1>
        <p className="text-muted-foreground mt-1 text-sm">Broadcast notifications to customers in real-time.</p>
      </header>

      <div className="surface-card rounded-3xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-4">Send Broadcast Notification</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input className="mt-1" placeholder="Order shipped!" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><Label>Type</Label>
            <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm capitalize" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {["info", "success", "warning", "error"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div><Label>Target</Label>
            <select className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
              <option value="all">All Customers</option>
              <option value="active">Active Users</option>
              <option value="vip">VIP Customers</option>
            </select>
          </div>
          <div><Label>Message</Label><Input className="mt-1" placeholder="Your order is on the way…" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
        </div>
        <Button variant="hero" size="sm" className="mt-4" onClick={send} disabled={sending}>
          <Send className="size-4 mr-1" />{sending ? "Sending…" : "Send Notification"}
        </Button>
      </div>

      <div className="surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-4">Notification History</h3>
        {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : notifs.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No notifications sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {notifs.map(n => (
              <li key={n.id} className="border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{n.body}</div>
                  <div className="text-muted-foreground text-[10px] mt-1">{n.target} · {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</div>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", TYPE_COLOR[n.type] ?? "bg-surface-muted")}>{n.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
