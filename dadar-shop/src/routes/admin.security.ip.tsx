import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shield, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/security/ip")({ component: IPRestrictionsPage });

function IPRestrictionsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIP, setNewIP] = useState("");
  const [newMode, setNewMode] = useState("block");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    adminFetch<any[]>("ip-rules")
      .then(d => { setRules(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function add() {
    if (!newIP.trim()) { toast.error("IP address required"); return; }
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/ip-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ ip: newIP.trim(), mode: newMode, note: newNote }),
      });
      const d = await res.json();
      if (res.ok) { setRules(prev => [...prev, d]); setNewIP(""); setNewNote(""); toast.success("Rule added"); }
      else toast.error(d.error ?? "Failed");
    } catch { toast.error("Failed"); }
  }

  async function del(id: string) {
    if (!confirm("Remove rule?")) return;
    try {
      await fetch(`${API_ORIGIN}/api/admin/ip-rules/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` } });
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Rule removed");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Shield className="size-7 text-indigo-600" /> IP Restrictions</h1>
        <p className="text-muted-foreground mt-1 text-sm">Block or allow specific IP addresses.</p>
      </header>
      <div className="surface-card rounded-3xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3">Add Rule</h3>
        <div className="flex flex-wrap gap-3">
          <div><Label className="text-xs mb-1 block">IP Address</Label><Input placeholder="192.168.0.1" value={newIP} onChange={e => setNewIP(e.target.value)} className="w-44" /></div>
          <div>
            <Label className="text-xs mb-1 block">Mode</Label>
            <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={newMode} onChange={e => setNewMode(e.target.value)}>
              <option value="block">Block</option>
              <option value="allow">Allow</option>
            </select>
          </div>
          <div className="flex-1"><Label className="text-xs mb-1 block">Note</Label><Input placeholder="Optional note…" value={newNote} onChange={e => setNewNote(e.target.value)} /></div>
        </div>
        <Button onClick={add} variant="brand" size="sm" className="mt-3"><Plus className="size-4 mr-1" />Add Rule</Button>
      </div>
      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div> :
          rules.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No IP rules configured.</div> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted">
                <tr>{["IP Address", "Mode", "Note", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map(r => (
                  <tr key={r.id} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3 font-mono text-sm">{r.ip}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.mode === "block" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{r.mode}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.note ?? "—"}</td>
                    <td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-rose-600"><Trash2 className="size-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </AdminLayout>
  );
}
