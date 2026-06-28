import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Headphones, MessageSquare, CheckCircle2 } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/support-tickets")({ component: SupportTicketsPage });

function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [tab, setTab] = useState<"open" | "resolved" | "all">("open");

  useEffect(() => {
    adminFetch("support-tickets")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) { setTickets(d); if (d.length > 0) setSelected(d[0]); } setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function resolve(id: string) {
    const res = await fetch(`${API_ORIGIN}/api/admin/support-tickets/${id}/resolve`, {
      method: "PUT", headers: { Authorization: `Bearer ${getAdminToken()}` }
    });
    if (res.ok) { setTickets(t => t.map(x => x.id === id ? { ...x, status: "resolved" } : x)); toast.success("Ticket resolved"); }
  }

  async function sendReply(id: string) {
    if (!reply.trim()) return;
    const res = await fetch(`${API_ORIGIN}/api/admin/support-tickets/${id}/reply`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ message: reply }),
    });
    if (res.ok) { toast.success("Reply sent"); setReply(""); }
    else toast.error("Failed to send reply");
  }

  const filtered = tickets.filter(t => tab === "all" ? true : t.status === tab);
  const STATUS_COLOR: Record<string, string> = { open: "bg-amber-100 text-amber-800", resolved: "bg-emerald-100 text-emerald-800", pending: "bg-blue-100 text-blue-800" };

  const counts = { open: tickets.filter(t => t.status === "open").length, resolved: tickets.filter(t => t.status === "resolved").length };

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Headphones className="size-7 text-blue-600" /> Support Tickets</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage customer support requests and inquiries.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Open</div><div className="text-display mt-1 text-2xl font-semibold text-amber-700">{counts.open}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Resolved</div><div className="text-display mt-1 text-2xl font-semibold text-emerald-700">{counts.resolved}</div></div>
        <div className="surface-card rounded-3xl p-4"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">Total</div><div className="text-display mt-1 text-2xl font-semibold">{tickets.length}</div></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="surface-card rounded-3xl p-3">
          <div className="flex gap-1 mb-3 p-1 bg-surface-muted rounded-2xl">
            {(["open", "resolved", "all"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("flex-1 rounded-xl py-1.5 text-xs font-medium capitalize transition", tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
                {t}
              </button>
            ))}
          </div>
          {loading ? <p className="text-muted-foreground text-sm text-center py-6">Loading…</p> : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No {tab} tickets.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map(t => (
                <li key={t.id}>
                  <button onClick={() => setSelected(t)}
                    className={cn("w-full text-left rounded-2xl px-3 py-2.5 transition", selected?.id === t.id ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted")}>
                    <div className="font-semibold text-sm truncate">{t.subject ?? t.category ?? "Support Request"}</div>
                    <div className={cn("text-xs truncate mt-0.5", selected?.id === t.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {t.customerName} · #{t.id?.slice(-6)}
                    </div>
                    <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLOR[t.status] ?? "bg-surface-muted text-foreground")}>{t.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="surface-card rounded-3xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{selected.subject ?? selected.category ?? "Support Request"}</h3>
                <p className="text-muted-foreground text-xs mt-1">From {selected.customerName} · {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ""}</p>
              </div>
              {selected.status === "open" && (
                <Button size="sm" variant="outline" onClick={() => resolve(selected.id)}><CheckCircle2 className="size-3.5 mr-1 text-emerald-600" />Resolve</Button>
              )}
            </div>
            <div className="bg-surface-muted rounded-2xl p-4 text-sm">{selected.message ?? selected.body ?? "No message content."}</div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Reply</Label>
              <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-24 resize-none"
                placeholder="Type your reply…" value={reply} onChange={e => setReply(e.target.value)} />
              <Button size="sm" variant="hero" className="mt-2" onClick={() => sendReply(selected.id)}>
                <MessageSquare className="size-3.5 mr-1" />Send Reply
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
