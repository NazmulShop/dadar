import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Search,
  UserPlus,
  UserX,
  Lock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_ORIGIN } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/admins")({
  component: AdminManagementPage,
});

type Role = "user" | "seller" | "admin";
type Status = "active" | "banned" | "suspended";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isSuperAdmin: boolean;
  status: Status;
  emailVerified: boolean;
  createdAt: number;
}

interface CurrentUser {
  id: string;
  role: Role;
  isSuperAdmin: boolean;
}

const ROLE_TONE: Record<Role, string> = {
  admin: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  seller: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  user: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const STATUS_TONE: Record<Status, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  banned: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  suspended: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

function getToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("dadar.auth.session.v2");
    if (!raw) return "";
    return (JSON.parse(raw) as { token?: string })?.token ?? "";
  } catch {
    return "";
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error ?? `Request failed (${res.status})`);
  return body as T;
}

function toast(message: string, kind: "success" | "error" = "success") {
  if (typeof window === "undefined") return;
  const el = document.createElement("div");
  el.textContent = message;
  el.className =
    "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-2xl px-4 py-2 text-sm font-medium shadow-lg " +
    (kind === "success"
      ? "bg-emerald-600 text-white"
      : "bg-rose-600 text-white");
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function AdminManagementPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [sort, setSort] = useState<"createdAt" | "name" | "email" | "role">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
  }>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Load current user once
  useEffect(() => {
    api<{ user: CurrentUser }>("/api/auth/me")
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQ,
        role: roleFilter,
        status: statusFilter,
        sort,
        order,
        page: String(page),
        pageSize: String(pageSize),
      });
      const data = await api<{ users: ManagedUser[]; total: number }>(
        `/api/admin/users?${params.toString()}`,
      );
      setUsers(data.users);
      setTotal(data.total);
    } catch (e: any) {
      toast(e.message ?? "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, roleFilter, statusFilter, sort, order, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const isSuper = me?.isSuperAdmin ?? false;

  const actions = useMemo(
    () => ({
      promote(u: ManagedUser) {
        setConfirm({
          title: "Promote to Admin?",
          body: `Grant admin privileges to ${u.name} (${u.email}). They will gain access to admin tools.`,
          confirmLabel: "Promote",
          onConfirm: async () => {
            setBusyId(u.id);
            try {
              await api(`/api/admin/users/${u.id}/promote`, { method: "POST", body: "{}" });
              toast(`${u.name} promoted to admin.`);
              await load();
            } catch (e: any) {
              toast(e.message ?? "Promotion failed", "error");
            } finally {
              setBusyId(null);
            }
          },
        });
      },
      demote(u: ManagedUser) {
        setConfirm({
          title: "Remove Admin role?",
          body: `Revoke admin privileges from ${u.name} (${u.email}).`,
          confirmLabel: "Remove admin",
          danger: true,
          onConfirm: async () => {
            setBusyId(u.id);
            try {
              await api(`/api/admin/users/${u.id}/demote`, {
                method: "POST",
                body: JSON.stringify({ newRole: "user" }),
              });
              toast(`${u.name} is no longer an admin.`);
              await load();
            } catch (e: any) {
              toast(e.message ?? "Removal failed", "error");
            } finally {
              setBusyId(null);
            }
          },
        });
      },
      setStatus(u: ManagedUser, status: Status) {
        const label = status === "active" ? "Reactivate" : status === "banned" ? "Ban" : "Suspend";
        setConfirm({
          title: `${label} user?`,
          body: `${label} ${u.name} (${u.email}).`,
          confirmLabel: label,
          danger: status !== "active",
          onConfirm: async () => {
            setBusyId(u.id);
            try {
              await api(`/api/admin/users/${u.id}/status`, {
                method: "POST",
                body: JSON.stringify({ status }),
              });
              toast(`${u.name} ${status}.`);
              await load();
            } catch (e: any) {
              toast(e.message ?? "Update failed", "error");
            } finally {
              setBusyId(null);
            }
          },
        });
      },
    }),
    [load],
  );

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6">
        <Link
          to="/admin"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3.5" /> Back to admin
        </Link>

        <header className="surface-card mb-4 rounded-3xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
                <ShieldCheck className="size-7" /> Admin Management
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                View users, promote to admin, remove admin role, ban or suspend.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/activity-logs">Activity logs</Link>
              </Button>
              {!isSuper && me && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  <Lock className="size-3" /> Read-only (Super Admin required)
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Filters */}
        <section className="surface-card mb-4 rounded-3xl p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search name or email"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select
              className="bg-background h-10 rounded-2xl border px-3 text-sm"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">All roles</option>
              <option value="user">User</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
            <select
              className="bg-background h-10 rounded-2xl border px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              className="bg-background h-10 rounded-2xl border px-3 text-sm"
              value={`${sort}:${order}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split(":");
                setSort(s as any);
                setOrder(o as any);
                setPage(1);
              }}
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="name:asc">Name A-Z</option>
              <option value="name:desc">Name Z-A</option>
              <option value="email:asc">Email A-Z</option>
              <option value="role:asc">Role A-Z</option>
            </select>
          </div>
        </section>

        {/* Table — desktop */}
        <section className="surface-card hidden rounded-3xl p-2 md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Registered</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={6} className="px-3 py-4">
                        <div className="bg-muted h-6 w-full animate-pulse rounded-md" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-3 py-8 text-center text-sm">
                      No users match these filters.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-muted/40 border-t">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 font-medium">
                          {u.isSuperAdmin && (
                            <span title="Super Admin">
                              <ShieldAlert className="size-4 text-violet-600 dark:text-violet-300" />
                            </span>
                          )}
                          {u.name}
                        </div>
                      </td>
                      <td className="text-muted-foreground px-3 py-3">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", ROLE_TONE[u.role])}>
                          {u.isSuperAdmin ? "Super Admin" : u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[u.status])}>
                          {u.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-3 py-3 text-xs">{fmtDate(u.createdAt)}</td>
                      <td className="px-3 py-3">
                        <RowActions
                          u={u}
                          isSuper={isSuper}
                          isSelf={me?.id === u.id}
                          busy={busyId === u.id}
                          onPromote={() => actions.promote(u)}
                          onDemote={() => actions.demote(u)}
                          onStatus={(s) => actions.setStatus(u, s)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Cards — mobile */}
        <section className="space-y-3 md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface-card rounded-3xl p-4">
                <div className="bg-muted h-5 w-2/3 animate-pulse rounded" />
                <div className="bg-muted mt-2 h-4 w-1/2 animate-pulse rounded" />
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="surface-card text-muted-foreground rounded-3xl p-6 text-center text-sm">
              No users match these filters.
            </div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="surface-card rounded-3xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {u.isSuperAdmin && <ShieldAlert className="size-4 text-violet-600 dark:text-violet-300" />}
                      <span className="truncate">{u.name}</span>
                    </div>
                    <div className="text-muted-foreground truncate text-xs">{u.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", ROLE_TONE[u.role])}>
                      {u.isSuperAdmin ? "Super Admin" : u.role}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[u.status])}>
                      {u.status}
                    </span>
                  </div>
                </div>
                <div className="text-muted-foreground mt-2 text-[11px]">
                  Registered {fmtDate(u.createdAt)}
                </div>
                <div className="mt-3">
                  <RowActions
                    u={u}
                    isSuper={isSuper}
                    isSelf={me?.id === u.id}
                    busy={busyId === u.id}
                    onPromote={() => actions.promote(u)}
                    onDemote={() => actions.demote(u)}
                    onStatus={(s) => actions.setStatus(u, s)}
                  />
                </div>
              </div>
            ))
          )}
        </section>

        {/* Pagination */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-muted-foreground text-xs">
            {total} {total === 1 ? "user" : "users"} · page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const fn = confirm.onConfirm;
            setConfirm(null);
            await fn();
          }}
        />
      )}
    </div>
  );
}

function RowActions({
  u,
  isSuper,
  isSelf,
  busy,
  onPromote,
  onDemote,
  onStatus,
}: {
  u: ManagedUser;
  isSuper: boolean;
  isSelf: boolean;
  busy: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onStatus: (s: Status) => void;
}) {
  // Super Admin row is fully protected.
  if (u.isSuperAdmin) {
    return (
      <div className="flex items-center justify-end gap-1 text-xs">
        <Lock className="size-3.5" />
        <span className="text-muted-foreground">Protected</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {busy && <Loader2 className="size-4 animate-spin" />}
      {u.role !== "admin" && (
        <Button
          variant="outline"
          size="sm"
          disabled={!isSuper || busy || !u.emailVerified || u.status !== "active"}
          onClick={onPromote}
          title={!u.emailVerified ? "Email must be verified" : !isSuper ? "Super Admin only" : ""}
        >
          <UserPlus className="size-3.5" /> Promote
        </Button>
      )}
      {u.role === "admin" && (
        <Button
          variant="outline"
          size="sm"
          disabled={!isSuper || busy || isSelf}
          onClick={onDemote}
        >
          <UserX className="size-3.5" /> Remove admin
        </Button>
      )}
      {u.status === "active" ? (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || isSelf || (u.role === "admin" && !isSuper)}
            onClick={() => onStatus("suspended")}
          >
            Suspend
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || isSelf || (u.role === "admin" && !isSuper)}
            onClick={() => onStatus("banned")}
          >
            <XCircle className="size-3.5" /> Ban
          </Button>
        </>
      ) : (
        <Button
          variant="hero"
          size="sm"
          disabled={busy || (u.role === "admin" && !isSuper)}
          onClick={() => onStatus("active")}
        >
          <CheckCircle2 className="size-3.5" /> Reactivate
        </Button>
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground w-full max-w-md rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-display text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-2 text-sm">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? "destructive" : "hero"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
