import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/support/help-center")({ component: HelpCenterPage });

function HelpCenterPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    adminFetch<any[]>("faqs")
      .then(d => { setFaqs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function add() {
    if (!form.question || !form.answer) { toast.error("Both fields required"); return; }
    setAdding(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok) { setFaqs(prev => [...prev, d]); setForm({ question: "", answer: "" }); toast.success("FAQ added"); }
      else toast.error(d.error ?? "Failed");
    } catch { toast.error("Failed"); }
    setAdding(false);
  }

  async function del(id: string) {
    if (!confirm("Delete FAQ?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/faqs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setFaqs(prev => prev.filter(f => f.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><HelpCircle className="size-7 text-teal-600" /> Help Center FAQs</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage frequently asked questions shown to customers.</p>
      </header>
      <div className="surface-card rounded-3xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3">Add FAQ</h3>
        <div className="space-y-3">
          <div><Label className="text-xs mb-1 block">Question</Label><Input placeholder="What is your return policy?" value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">Answer</Label><Textarea placeholder="You can return items within 7 days…" rows={3} value={form.answer} onChange={e => setForm(p => ({ ...p, answer: e.target.value }))} /></div>
          <Button onClick={add} disabled={adding} variant="brand" size="sm"><Plus className="size-4 mr-1" />Add FAQ</Button>
        </div>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          faqs.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No FAQs yet.</div> : (
            <ul className="divide-y divide-border">
              {faqs.map(f => (
                <li key={f.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <button className="flex-1 text-left font-medium text-sm flex items-start gap-2" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                      {expanded === f.id ? <ChevronUp className="size-4 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 mt-0.5 shrink-0 text-muted-foreground" />}
                      {f.question}
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => del(f.id)} className="text-rose-600 shrink-0"><Trash2 className="size-3" /></Button>
                  </div>
                  {expanded === f.id && <p className="mt-2 ml-6 text-sm text-muted-foreground">{f.answer}</p>}
                </li>
              ))}
            </ul>
          )}
      </div>
    </AdminLayout>
  );
}
