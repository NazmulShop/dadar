import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldBan, Search, UserCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users/banned")({ component: BannedUsersPage });

interface User {
  id: string; name: string; email: string; role: string;
  status: string; createdAt: number;
}

function BannedUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminFetch<User[]>("users")
      .then(d => { setUsers(Array.isArray(d) ? d.filter(u => u.status === "banned") : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));

  async function unban(id: string) {
    try {
      await fetch(`${API_ORIGIN}/api/admin/users/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ status: "active" }),
      });
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("User unbanned");
    } catch { toast.error("Failed"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><ShieldBan className="size-7 text-rose-600" /> Banned Users</h1>
        <p className="text-muted-foreground mt-1 text-sm">View and manage all banned accounts.</p>
      </header>

      <div className="surface-card mb-4 rounded-3xl p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search banned users…" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div> :
          filtered.length === 0 ? <div className="py-16 text-center text-muted-foreground text-sm">No banned users.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-muted">
                  <tr>{["User", "Email", "Role", "Banned On", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-3"><div className="font-medium">{u.name}</div><div className="text-xs font-mono text-muted-foreground">{u.id}</div></td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-semibold">{u.role}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => unban(u.id)}><UserCheck className="size-3 mr-1" />Unban</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </AdminLayout>
  );
}
