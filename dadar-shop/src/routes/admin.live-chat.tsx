import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Send } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/live-chat")({ component: LiveChatPage });

function LiveChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function loadSessions() {
      adminFetch<any[]>("live-chat/sessions").then(d => {
        if (Array.isArray(d)) {
          setSessions(d);
          setSelected((cur: any) => cur ?? d[0] ?? null);
        }
      }).catch(() => {});
    }
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selected) return;
    function loadMessages() {
      fetch(`${API_ORIGIN}/api/admin/live-chat/sessions/${selected.id}/messages`, { headers: { Authorization: `Bearer ${getAdminToken()}` } })
        .then(r => r.json()).then(d => { if (Array.isArray(d)) setMessages(d); })
        .catch(() => {});
    }
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [selected?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!msg.trim() || !selected) return;
    const text = msg; setMsg("");
    const res = await fetch(`${API_ORIGIN}/api/admin/live-chat/sessions/${selected.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify({ message: text, sender: "admin" }),
    });
    if (res.ok) {
      const d = await res.json();
      setMessages(m => [...m, d]);
    }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><MessageCircle className="size-7 text-emerald-600" /> Live Chat</h1>
        <p className="text-muted-foreground mt-1 text-sm">Real-time customer chat support.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
        <div className="surface-card rounded-3xl p-3 overflow-y-auto">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground px-2 mb-2">Active Sessions</h3>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No active chat sessions.</p>
          ) : (
            <ul className="space-y-1">
              {sessions.map(s => (
                <li key={s.id}>
                  <button onClick={() => setSelected(s)}
                    className={cn("w-full text-left rounded-2xl px-3 py-2.5 transition", selected?.id === s.id ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted")}>
                    <div className="font-semibold text-sm">{s.customerName ?? "Guest"}</div>
                    <div className={cn("text-xs truncate", selected?.id === s.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {s.lastMessage ?? "No messages yet"}
                    </div>
                    {s.unread > 0 && <span className="mt-1 inline-block bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">{s.unread}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card rounded-3xl flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a chat session</div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <div className="font-semibold text-sm">{selected.customerName ?? "Guest"}</div>
                <div className="text-muted-foreground text-xs">{selected.customerEmail ?? ""}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No messages yet.</p>}
                {messages.map(m => (
                  <div key={m.id} className={cn("flex", m.sender === "admin" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                      m.sender === "admin" ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground")}>
                      {m.message}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Input value={msg} onChange={e => setMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Type a message…" className="flex-1" />
                <Button size="sm" variant="hero" onClick={send} disabled={!msg.trim()}><Send className="size-4" /></Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
