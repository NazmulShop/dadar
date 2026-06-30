import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Search, Ban, UserCheck, UserPlus, Mail, Phone, ShieldCheck, Download } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { adminFetch, adminPost, API_ORIGIN, getAdminToken } from "@/lib/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

interface User {
  id: string; name: string; email: string; phone: string | null;
  role: string; status: string; emailVerified: boolean; createdAt: number;
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  banned: "bg-rose-100 text-rose-800",
  suspended: "bg-amber-100 text-amber-800",
};
const ROLE_TONE: Record<string, string> = {
  admin: "bg-violet-100 text-violet-800",
  seller: "bg-amber-100 text-amber-800",
  user: "bg-slate-100 text-slate-700",
};

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    adminFetch<User[]>("users")
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    users.filter(u =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (!q || u.name.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase()) ||
        u.id.toLowerCase().includes(q.toLowerCase()))
    ), [users, q, roleFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  async function banUser(id: string, currentStatus: string) {
    const newStatus = currentStatus === "banned" ? "active" : "banned";
    try {
      await fetch(`${API_ORIGIN}/api/admin/users/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
      toast.success(newStatus === "banned" ? "User banned" : "User unbanned");
    } catch { toast.error("Failed to update status"); }
  }

  async function promoteToAdmin(id: string) {
    try {
      await fetch(`${API_ORIGIN}/api/admin/users/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ role: "admin" }),
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: "admin" } : u));
      toast.success("User promoted to admin");
    } catch { toast.error("Failed to update role"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
              <Users className="size-7" /> All Users
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage all registered users, roles, and status.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="size-4 mr-1" /> Export</Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Users", value: users.length },
            { label: "Active", value: users.filter(u => u.status === "active").length },
            { label: "Admins", value: users.filter(u => u.role === "admin").length },
            { label: "Banned", value: users.filter(u => u.status === "banned").length },
          ].map(s => (
            <div key={s.label} className="bg-surface-muted rounded-2xl p-3">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{s.label}</div>
              <div className="text-display mt-1 text-lg font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="surface-card rounded-3xl p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, email or ID…" className="pl-9" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
          </div>
          <select className="rounded-lg border border-border bg-background px-3 text-sm" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="all">All roles</option>
            <option value="user">Users</option>
            <option value="seller">Sellers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <div className="surface-card rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading users…</div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted">
                <tr>
                  {["User", "Contact", "Role", "Status", "Verified", "Joined", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map(u => (
                  <tr key={u.id} className="hover:bg-surface-muted/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-muted-foreground text-xs font-mono">{u.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="size-3" />{u.email}</div>
                      {u.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{u.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", ROLE_TONE[u.role] ?? "bg-slate-100 text-slate-700")}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[u.status] ?? "bg-slate-100 text-slate-700")}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.emailVerified ? <ShieldCheck className="size-4 text-emerald-600" /> : <span className="text-xs text-muted-foreground">No</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => banUser(u.id, u.status)}>
                          {u.status === "banned" ? <><UserCheck className="size-3 mr-1" />Unban</> : <><Ban className="size-3 mr-1" />Ban</>}
                        </Button>
                        {u.role !== "admin" && (
                          <Button variant="ghost" size="sm" onClick={() => promoteToAdmin(u.id)}>
                            <UserPlus className="size-3 mr-1" />Admin
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
