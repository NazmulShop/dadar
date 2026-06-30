import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserCog, Users } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/lib/adminApi";

export const Route = createFileRoute("/admin/users/roles")({ component: UserRolesPage });

function UserRolesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<any[]>("users")
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const roleCounts = users.reduce((acc: Record<string, number>, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1; return acc;
  }, {});

  const roles = [
    { role: "admin", label: "Admin", description: "Full access to all admin features", color: "bg-violet-100 text-violet-800" },
    { role: "seller", label: "Seller / Vendor", description: "Manage own products and orders", color: "bg-amber-100 text-amber-800" },
    { role: "user", label: "Customer", description: "Browse, buy and track orders", color: "bg-slate-100 text-slate-700" },
  ];

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><UserCog className="size-7" /> User Roles</h1>
        <p className="text-muted-foreground mt-1 text-sm">Overview of roles and member counts.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {roles.map(r => (
          <div key={r.role} className="surface-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.color}`}>{r.label}</span>
              <span className="flex items-center gap-1 text-muted-foreground text-sm"><Users className="size-3.5" />{loading ? "…" : (roleCounts[r.role] ?? 0)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{r.description}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
