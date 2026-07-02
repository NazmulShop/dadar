import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Book,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Heart,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ORIGIN } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/support")({
  component: SupportCenter,
});

type Tab = "tickets" | "chat" | "chatbot" | "faq" | "kb" | "contact" | "callback";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "tickets", label: "Tickets", icon: FileText },
  { id: "chat", label: "Live Chat", icon: MessageCircle },
  { id: "chatbot", label: "AI Assistant", icon: Bot },
  { id: "faq", label: "FAQ", icon: MessageSquare },
  { id: "kb", label: "Knowledge Base", icon: Book },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "callback", label: "Callback", icon: Phone },
];

const STATUS_TONE: Record<string, string> = {
  Open: "bg-primary-soft text-primary",
  "Awaiting reply": "bg-amber-100 text-amber-800",
  "In progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  Closed: "bg-slate-100 text-slate-600",
};

const PRIORITY_TONE: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600",
  Normal: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-800",
  Urgent: "bg-rose-100 text-rose-800",
};

function token(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem("dadar.auth.session.v2");
    if (!raw) return "";
    return (JSON.parse(raw) as { token?: string })?.token ?? "";
  } catch {
    return "";
  }
}

async function apiGet(path: string) {
  const res = await fetch(`${API_ORIGIN}/api/support/${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function apiPost(path: string, body: object) {
  const res = await fetch(`${API_ORIGIN}/api/support/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/* ═══════════════════════════════════════════ MAIN ══════════════════════════════════════ */

function SupportCenter() {
  const [tab, setTab] = useState<Tab>("tickets");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
          <LifeBuoy className="size-6" /> Support Centre
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">
          Live chat · AI assistant · tickets · FAQ · knowledge base · contact · callback
        </p>
      </header>

      <nav className="surface-card flex gap-1 overflow-x-auto rounded-3xl p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium transition",
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-surface-muted",
              )}
            >
              <Icon className="size-3.5" /> {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "tickets" && <TicketsTab />}
      {tab === "chat" && <LiveChatTab />}
      {tab === "chatbot" && <ChatbotTab />}
      {tab === "faq" && <FaqTab />}
      {tab === "kb" && <KnowledgeBaseTab />}
      {tab === "contact" && <ContactTab />}
      {tab === "callback" && <CallbackTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════ TICKETS ══════════════════════════════════ */

function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Other");
  const [priority, setPriority] = useState("Normal");
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiGet("tickets").then(d => { if (Array.isArray(d)) setTickets(d); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function loadTicket(id: string) {
    apiGet(`tickets/${id}`).then(d => { if (d.id) setSelected(d); }).catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await apiPost("tickets", { subject, body, category, priority }).catch(() => {});
    setSubject(""); setBody(""); setCategory("Other"); setPriority("Normal");
    setShowNew(false); setSubmitting(false);
    load();
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    await apiPost(`tickets/${selected.id}/messages`, { body: reply }).catch(() => {});
    setReply("");
    loadTicket(selected.id);
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="size-3.5" /> All tickets
        </button>
        <div className="surface-card rounded-3xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{selected.id}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[selected.status] ?? "bg-slate-100")}>{selected.status}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", PRIORITY_TONE[selected.priority] ?? "bg-slate-100")}>{selected.priority}</span>
              </div>
              <h2 className="mt-1 text-base font-semibold">{selected.subject}</h2>
              <p className="text-muted-foreground text-[11px]">{selected.category} · opened {new Date(selected.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {(selected.messages ?? []).map((m: any) => (
              <li key={m.id} className={cn("rounded-2xl p-3", m.senderRole === "customer" ? "bg-primary/10 ml-8" : m.senderRole === "agent" ? "bg-emerald-50 mr-8" : "bg-surface-muted mr-8")}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold">{m.senderName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="whitespace-pre-wrap text-xs">{m.body}</p>
              </li>
            ))}
          </ul>
          {selected.status !== "Resolved" && selected.status !== "Closed" && (
            <form onSubmit={sendReply} className="mt-4 flex gap-2">
              <Textarea rows={2} value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply…" className="flex-1 resize-none" />
              <Button type="submit" variant="hero" size="sm" className="self-end"><Send className="size-4" /></Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</span>
        <Button variant="hero" size="sm" onClick={() => setShowNew(v => !v)} className="gap-1">
          <Plus className="size-4" /> {showNew ? "Cancel" : "New ticket"}
        </Button>
      </div>

      {showNew && (
        <form onSubmit={submit} className="surface-card space-y-3 rounded-3xl p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Subject</Label>
              <Input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="bg-surface-muted h-9 w-full rounded-2xl px-3 text-sm">
                {["Order", "Payment", "Delivery", "Return", "Product", "Account", "Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="bg-surface-muted h-9 w-full rounded-2xl px-3 text-sm">
                {["Low", "Normal", "High", "Urgent"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Describe your issue</Label>
              <Textarea required rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Please provide as much detail as possible…" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="hero" disabled={submitting} className="gap-1">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit ticket
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="surface-card rounded-3xl p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></div>
      ) : tickets.length === 0 ? (
        <div className="surface-card rounded-3xl p-10 text-center">
          <FileText className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No tickets yet</p>
          <p className="text-muted-foreground text-xs">Create a support ticket for any issue and our team will respond within 2–4 hours.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map(t => (
            <li key={t.id}>
              <button onClick={() => loadTicket(t.id)} className="surface-card group w-full rounded-3xl p-4 text-left transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[t.status] ?? "bg-slate-100")}>{t.status}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", PRIORITY_TONE[t.priority] ?? "bg-slate-100")}>{t.priority}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold">{t.subject}</p>
                    <p className="text-muted-foreground text-[11px]">{t.category} · {new Date(t.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition mt-1" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ LIVE CHAT ════════════════════════════════ */

function LiveChatTab() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [session, setSession] = useState<any | null>(null);
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pollSession(id: string) {
    apiGet(`chat/${id}`).then(d => {
      if (d.messages) setMessages(d.messages);
      if (d.status) setSession(d);
    }).catch(() => {});
  }

  useEffect(() => {
    if (!sessionId) return;
    pollRef.current = setInterval(() => pollSession(sessionId), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    setStarting(true);
    const d = await apiPost("chat/start", { topic }).catch(() => null);
    if (d?.sessionId) {
      setSessionId(d.sessionId);
      pollSession(d.sessionId);
    }
    setStarting(false);
  }

  async function sendMsg(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !input.trim() || sending) return;
    const body = input.trim();
    setInput("");
    setSending(true);
    setMessages(prev => [...prev, { id: `tmp-${Date.now()}`, senderRole: "customer", senderName: "You", body, createdAt: new Date().toISOString() }]);
    await apiPost(`chat/${sessionId}/message`, { body }).catch(() => {});
    setSending(false);
    pollSession(sessionId);
  }

  async function endChat() {
    if (!sessionId) return;
    await apiPost(`chat/${sessionId}/end`, {}).catch(() => {});
    pollSession(sessionId);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  if (!sessionId) {
    return (
      <div className="surface-card rounded-3xl p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="bg-emerald-100 rounded-2xl p-2.5">
            <MessageCircle className="size-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-display font-semibold">Live Chat Support</h3>
            <p className="text-muted-foreground text-xs">Average wait time: 2–5 minutes · Available 9am–9pm</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
          </span>
        </div>
        <form onSubmit={startChat} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">What do you need help with?</Label>
            <select value={topic} onChange={e => setTopic(e.target.value)} className="bg-surface-muted h-9 w-full rounded-2xl px-3 text-sm">
              <option value="">Select a topic…</option>
              <option>Order issue</option>
              <option>Return or refund</option>
              <option>Payment problem</option>
              <option>Delivery query</option>
              <option>Product question</option>
              <option>Account help</option>
              <option>Other</option>
            </select>
          </div>
          <Button type="submit" variant="hero" className="gap-1.5 w-full" disabled={starting}>
            {starting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />} Start chat
          </Button>
        </form>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
          <div className="bg-surface-muted rounded-2xl p-2"><p className="font-semibold text-foreground">8am–10pm</p><p>Hours daily</p></div>
          <div className="bg-surface-muted rounded-2xl p-2"><p className="font-semibold text-foreground">~3 min</p><p>Avg wait</p></div>
          <div className="bg-surface-muted rounded-2xl p-2"><p className="font-semibold text-foreground">98%</p><p>Satisfaction</p></div>
        </div>
      </div>
    );
  }

  const status = session?.status ?? "Queued";

  return (
    <div className="surface-card flex flex-col rounded-3xl overflow-hidden" style={{ height: 520 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn("size-2.5 rounded-full", status === "Active" ? "bg-emerald-500" : status === "Ended" ? "bg-slate-400" : "bg-amber-400 animate-pulse")} />
          <span className="text-sm font-semibold">{status === "Active" ? `Chatting with ${session?.agentName ?? "Agent"}` : status === "Ended" ? "Chat ended" : "Waiting for agent…"}</span>
        </div>
        {status !== "Ended" && (
          <button onClick={endChat} className="text-muted-foreground hover:text-rose-600 text-[11px] flex items-center gap-1">
            <X className="size-3.5" /> End chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={cn("flex", m.senderRole === "customer" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-xs", m.senderRole === "customer" ? "bg-primary text-primary-foreground" : m.senderRole === "agent" ? "bg-emerald-50 border border-emerald-200" : "bg-surface-muted")}>
              {m.senderRole !== "customer" && <p className="font-semibold mb-0.5 text-[10px] text-muted-foreground">{m.senderName}</p>}
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={cn("mt-0.5 text-[10px]", m.senderRole === "customer" ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {status !== "Ended" && (
        <form onSubmit={sendMsg} className="flex gap-2 px-3 py-3 border-t border-border">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message…" className="flex-1" />
          <Button type="submit" variant="hero" size="sm" disabled={sending || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ AI CHATBOT ═══════════════════════════════ */

interface BotMessage { role: "user" | "bot"; text: string; at: string }

function ChatbotTab() {
  const [msgs, setMsgs] = useState<BotMessage[]>([{
    role: "bot",
    text: "👋 আমি Dadar AI Assistant! অর্ডার ট্র্যাকিং, রিটার্ন, পেমেন্ট, ডেলিভারি — সব বিষয়ে সাহায্য করতে পারি।\n\nকীভাবে সাহায্য করতে পারি?",
    at: new Date().toISOString(),
  }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || thinking) return;
    const text = input.trim();
    setInput("");
    const userMsg: BotMessage = { role: "user", text, at: new Date().toISOString() };
    const withUser = [...msgs, userMsg];
    setMsgs(withUser);
    setThinking(true);

    try {
      // Last 20 turns of context, sent to our own backend — which holds the
      // Anthropic API key server-side and never exposes it to the browser.
      const history = withUser
        .slice(0, -1)
        .slice(-20)
        .map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.text }));

      const data = await apiPost("chatbot", { message: text, history }) as { response?: string };
      const reply = data.response ?? "Sorry, I couldn't get a response. Please try again.";
      setMsgs(prev => [...prev, { role: "bot", text: reply, at: new Date().toISOString() }]);
    } catch {
      setMsgs(prev => [...prev, {
        role: "bot",
        text: "দুঃখিত, এই মুহূর্তে সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন বা লাইভ চ্যাটে আমাদের এজেন্টের সাথে কথা বলুন।",
        at: new Date().toISOString(),
      }]);
    } finally {
      setThinking(false);
    }
  }

  const QUICK = [
    "আমার অর্ডার কোথায়?",
    "রিটার্ন পলিসি কী?",
    "পেমেন্ট মেথড কী কী?",
    "ডেলিভারি কতদিনে হবে?",
    "অর্ডার ক্যান্সেল করব কীভাবে?",
    "লয়্যালটি পয়েন্ট কীভাবে ব্যবহার করব?",
  ];

  return (
    <div className="surface-card flex flex-col rounded-3xl overflow-hidden" style={{ height: 520 }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="bg-primary/10 rounded-xl p-1.5"><Bot className="size-4 text-primary" /></div>
        <div>
          <span className="text-sm font-semibold">Dadar AI Assistant</span>
          <p className="text-[11px] text-muted-foreground">সবসময় উপলব্ধ · তাৎক্ষণিক সাহায্য</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> AI
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "bot" && (
              <div className="bg-primary/10 mr-2 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full">
                <Bot className="size-3.5 text-primary" />
              </div>
            )}
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-xs", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-muted")}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              <p className={cn("mt-0.5 text-[10px]", m.role === "user" ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start items-end gap-2">
            <div className="bg-primary/10 flex size-6 shrink-0 items-center justify-center rounded-full">
              <Bot className="size-3.5 text-primary" />
            </div>
            <div className="bg-surface-muted rounded-2xl px-3 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => <span key={i} className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {msgs.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {QUICK.map(q => (
            <button key={q} onClick={() => setInput(q)} className="bg-surface-muted hover:bg-primary-soft rounded-full px-2.5 py-1 text-[11px] font-medium transition">
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={send} className="flex gap-2 px-3 py-3 border-t border-border">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="আপনার প্রশ্ন লিখুন…" className="flex-1" />
        <Button type="submit" variant="hero" size="sm" disabled={thinking || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════ FAQ ══════════════════════════════════════ */

function FaqTab() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [voted, setVoted] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiGet("faq").then(d => { if (Array.isArray(d)) setFaqs(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const cats = [...new Set(faqs.map(f => f.category))];
  const [cat, setCat] = useState("All");

  const list = faqs.filter(f =>
    (cat === "All" || f.category === cat) &&
    (!q || f.question.toLowerCase().includes(q.toLowerCase()) || f.answer.toLowerCase().includes(q.toLowerCase()))
  );

  function markHelpful(id: string) {
    if (voted.has(id)) return;
    setVoted(prev => new Set([...prev, id]));
    apiPost(`faq/${id}/helpful`, {}).catch(() => {});
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, helpfulCount: f.helpfulCount + 1 } : f));
  }

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search frequently asked questions…" className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["All", ...cats].map(c => (
            <button key={c} onClick={() => setCat(c)} className={cn("rounded-2xl px-3 py-1.5 text-xs font-medium transition", cat === c ? "bg-primary text-primary-foreground" : "bg-surface-muted hover:bg-primary-soft")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="surface-card rounded-3xl p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <ul className="space-y-2">
          {list.map(f => (
            <li key={f.id} className="surface-card rounded-3xl overflow-hidden">
              <button onClick={() => setOpen(open === f.id ? null : f.id)} className="flex w-full items-start gap-3 p-4 text-left">
                <span className="bg-primary-soft text-primary rounded-xl p-1.5 mt-0.5 shrink-0">
                  <MessageSquare className="size-3.5" />
                </span>
                <span className="flex-1 text-sm font-semibold">{f.question}</span>
                {open === f.id ? <ChevronUp className="size-4 shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground mt-0.5" />}
              </button>
              {open === f.id && (
                <div className="border-t border-border px-4 pb-4">
                  <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{f.answer}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Was this helpful?</span>
                    <button onClick={() => markHelpful(f.id)} disabled={voted.has(f.id)} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition", voted.has(f.id) ? "bg-emerald-100 text-emerald-700" : "bg-surface-muted hover:bg-emerald-50 hover:text-emerald-700")}>
                      <ThumbsUp className="size-3" /> {f.helpfulCount > 0 ? f.helpfulCount : ""} Yes
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {list.length === 0 && !loading && (
            <li className="surface-card rounded-3xl p-8 text-center text-muted-foreground text-sm">No matching FAQs. Try a different keyword.</li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ KNOWLEDGE BASE ═══════════════════════════ */

function KnowledgeBaseTab() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [voted, setVoted] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiGet("kb").then(d => { if (Array.isArray(d)) setArticles(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function openArticle(slug: string) {
    apiGet(`kb/${slug}`).then(d => { if (d.id) setSelected(d); }).catch(() => {});
  }

  function feedback(id: string, helpful: boolean) {
    if (voted.has(id)) return;
    setVoted(prev => new Set([...prev, id]));
    apiPost(`kb/${id}/feedback`, { helpful }).catch(() => {});
  }

  const cats = [...new Set(articles.map(a => a.category))];
  const [cat, setCat] = useState("All");

  const list = articles.filter(a =>
    (cat === "All" || a.category === cat) &&
    (!q || a.title.toLowerCase().includes(q.toLowerCase()))
  );

  if (selected) {
    const lines = selected.body.split("\n");
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="size-3.5" /> Knowledge base
        </button>
        <div className="surface-card rounded-3xl p-6">
          <span className="bg-primary-soft text-primary rounded-full px-2.5 py-1 text-[11px] font-medium">{selected.category}</span>
          <h2 className="text-display mt-3 text-2xl font-semibold">{selected.title}</h2>
          <p className="text-muted-foreground text-xs mt-1">{selected.views} views</p>
          <div className="mt-5 prose prose-sm max-w-none">
            {lines.map((line: string, i: number) => {
              if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mb-3 mt-4">{line.slice(2)}</h1>;
              if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mb-2 mt-4">{line.slice(3)}</h2>;
              if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="text-sm text-muted-foreground ml-4">{line.slice(2)}</li>;
              if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-sm font-semibold mt-3">{line.slice(2, -2)}</p>;
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
            })}
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Was this article helpful?</span>
            <button onClick={() => feedback(selected.id, true)} disabled={voted.has(selected.id)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm bg-surface-muted hover:bg-emerald-50 hover:text-emerald-700 transition disabled:opacity-50">
              <ThumbsUp className="size-4" /> Yes ({selected.helpful})
            </button>
            <button onClick={() => feedback(selected.id, false)} disabled={voted.has(selected.id)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm bg-surface-muted hover:bg-rose-50 hover:text-rose-700 transition disabled:opacity-50">
              <ThumbsDown className="size-4" /> No ({selected.notHelpful})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search knowledge base…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          {["All", ...cats].map(c => (
            <button key={c} onClick={() => setCat(c)} className={cn("rounded-2xl px-3 py-1.5 text-xs font-medium transition", cat === c ? "bg-primary text-primary-foreground" : "bg-surface-muted hover:bg-primary-soft")}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="surface-card rounded-3xl p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map(a => (
            <button key={a.id} onClick={() => openArticle(a.slug)} className="surface-card group rounded-3xl p-5 text-left transition hover:shadow-md">
              <span className="text-[11px] font-medium text-muted-foreground">{a.category}</span>
              <h3 className="mt-1 text-sm font-semibold group-hover:text-primary transition">{a.title}</h3>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Book className="size-3" /> {a.views} views</span>
                <span className="flex items-center gap-1"><Heart className="size-3" /> {a.helpful} helpful</span>
                <ArrowRight className="size-3.5 ml-auto group-hover:translate-x-0.5 transition" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ CONTACT ══════════════════════════════════ */

function ContactTab() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dept, setDept] = useState("General");
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const d = await apiPost("contact", { name, email, phone, subject, body, department: dept }).catch(() => null);
    setSubmitting(false);
    if (d?.ok) setDone(d.id);
  }

  if (done) {
    return (
      <div className="surface-card rounded-3xl p-10 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-600" />
        <h3 className="text-display text-lg font-semibold">Message sent!</h3>
        <p className="text-muted-foreground mt-1 text-sm">Reference: <code className="font-mono">{done}</code></p>
        <p className="text-muted-foreground mt-1 text-xs">We'll respond to <strong>{email}</strong> within 24 hours.</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => { setDone(null); setName(""); setEmail(""); setPhone(""); setSubject(""); setBody(""); }}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface-card space-y-4 rounded-3xl p-6">
      <div>
        <h3 className="text-display font-semibold">Contact Us</h3>
        <p className="text-muted-foreground text-xs mt-0.5">We respond within 24 hours on business days.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Full name *</Label>
          <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email address *</Label>
          <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone number</Label>
          <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880 17XX XXXXXX" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Department</Label>
          <select value={dept} onChange={e => setDept(e.target.value)} className="bg-surface-muted h-9 w-full rounded-2xl px-3 text-sm">
            {["General", "Orders & Delivery", "Returns & Refunds", "Payments", "Sellers", "Technical", "Feedback"].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Subject *</Label>
          <Input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief subject line" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Message *</Label>
          <Textarea required rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Describe your issue in detail. Include order IDs if relevant." />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[11px]">* Required fields</p>
        <Button type="submit" variant="hero" disabled={submitting} className="gap-1">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send message
        </Button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════ CALLBACK ═════════════════════════════════ */

const TIME_SLOTS = [
  "9:00am – 10:00am", "10:00am – 11:00am", "11:00am – 12:00pm",
  "12:00pm – 1:00pm", "2:00pm – 3:00pm", "3:00pm – 4:00pm",
  "4:00pm – 5:00pm", "5:00pm – 6:00pm", "6:00pm – 7:00pm", "7:00pm – 8:00pm",
];

function CallbackTab() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState(TIME_SLOTS[0]);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const d = await apiPost("callback", { name, phone, timeSlot: slot, reason }).catch(() => null);
    setSubmitting(false);
    if (d?.ok) setDone(d.id);
  }

  if (done) {
    return (
      <div className="surface-card rounded-3xl p-10 text-center">
        <div className="bg-emerald-100 mx-auto mb-3 size-14 rounded-full flex items-center justify-center">
          <Phone className="size-7 text-emerald-700" />
        </div>
        <h3 className="text-display text-lg font-semibold">Callback scheduled!</h3>
        <p className="text-muted-foreground mt-1 text-sm">Reference: <code className="font-mono">{done}</code></p>
        <p className="text-muted-foreground mt-1 text-xs">We'll call <strong>{phone}</strong> during your selected time slot.</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 rounded-2xl px-4 py-2 text-sm font-medium">
          <Clock className="size-4" /> {slot}
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => { setDone(null); setName(""); setPhone(""); setReason(""); }}>
            Request another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card rounded-3xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="bg-primary-soft rounded-2xl p-3 shrink-0">
            <Phone className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="text-display font-semibold">Request a Callback</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Our support agents call Monday–Saturday, 9am–8pm. Calls are free from any number.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name *</Label>
              <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone number *</Label>
              <Input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880 17XX XXXXXX" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Preferred time slot</Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {TIME_SLOTS.map(s => (
                  <button key={s} type="button" onClick={() => setSlot(s)}
                    className={cn("rounded-2xl px-3 py-2 text-xs font-medium transition text-left", slot === s ? "bg-primary text-primary-foreground" : "bg-surface-muted hover:bg-primary-soft")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Reason for callback (optional)</Label>
              <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. I need help with my order DS-1024…" />
            </div>
          </div>
          <Button type="submit" variant="hero" className="w-full gap-1.5" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />} Schedule callback for {slot}
          </Button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Phone, label: "Hotline", value: "16xxx", sub: "9am–9pm daily" },
          { icon: MessageCircle, label: "WhatsApp", value: "+880 1XXX-XXXXXX", sub: "9am–6pm weekdays" },
          { icon: Mail, label: "Email", value: "support@dadar.shop", sub: "24h response time" },
        ].map(c => (
          <div key={c.label} className="surface-card rounded-3xl p-4 text-center">
            <c.icon className="size-5 mx-auto mb-1.5 text-primary" />
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className="text-sm font-semibold">{c.value}</p>
            <p className="text-[10px] text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
