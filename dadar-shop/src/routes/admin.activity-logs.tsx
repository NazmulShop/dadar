import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_ORIGIN } from "@/lib/accountApi";

export const Route = createFileRoute("/admin/activity-logs")({
  component: ActivityLogsPage,
});

interface LogEntry {
  id: string;
  adminId: string;
  targetUserId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: number;
}

const ACTION_LABEL: Record<string, string> = {
  admin_promotion: "Admin promotion",
  admin_removal: "Admin removal",
  user_ban: "User banned",
  user_unban: "User unbanned",
  user_suspend: "User suspended",
  user_deleted: "User deleted",
  seller_approval: "Seller approved",
  product_approval: "Product approved",
  product_removal: "Product removed",
  settings_change: "Settings changed",
  super_admin_created: "Super Admin created",
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

function ActivityLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${API_ORIGIN}/api/admin/activity-logs?page=${page}&pageSize=${pageSize}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((d) => {
        if (Array.isArray(d?.logs)) {
          setLogs(d.logs);
          setTotal(d.total ?? 0);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto w-full max-w-[1100px] px-4 pt-6">
        <Link
          to="/admin"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3.5" /> Back to admin
        </Link>

        <header className="surface-card mb-4 rounded-3xl p-6">
          <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
            <ScrollText className="size-7" /> Activity logs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Audit trail of every privileged admin action.
          </p>
        </header>

        <section className="surface-card rounded-3xl p-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="px-3 py-3">When</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Admin</th>
                  <th className="px-3 py-3">Target</th>
                  <th className="px-3 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={5} className="px-3 py-4">
                        <div className="bg-muted h-5 w-full animate-pulse rounded" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="text-destructive px-3 py-8 text-center text-sm">
                      Couldn't load activity logs. Please try again.
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-3 py-8 text-center text-sm">
                      No activity yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="border-t align-top">
                      <td className="text-muted-foreground px-3 py-3 text-xs">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {ACTION_LABEL[l.action] ?? l.action}
                      </td>
                      <td className="text-muted-foreground px-3 py-3 font-mono text-xs">
                        {l.adminId.slice(0, 8)}…
                      </td>
                      <td className="text-muted-foreground px-3 py-3 font-mono text-xs">
                        {l.targetUserId ? `${l.targetUserId.slice(0, 8)}…` : "—"}
                      </td>
                      <td className="text-muted-foreground px-3 py-3 text-xs">
                        {l.details ? (
                          <pre className="whitespace-pre-wrap break-words text-[11px]">
                            {JSON.stringify(l.details, null, 2)}
                          </pre>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-muted-foreground text-xs">
            {total} entries · page {page} of {totalPages}
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
    </div>
  );
}
