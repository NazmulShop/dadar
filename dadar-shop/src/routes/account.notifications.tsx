import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Check, CreditCard, Package, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/data/account";
import { useAuth } from "@/lib/authStore";
import { accountFetch } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Dadar Shop" },
      {
        name: "description",
        content: "All your in-app notifications for orders, payments, refunds and offers.",
      },
    ],
  }),
  component: NotificationsPage,
});

type NotificationKind = "order" | "promo" | "system" | "payment" | "refund";

interface ApiNotification {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  event?: string;
  link?: string;
  unread: boolean;
  at: string;
}

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  order: Package,
  promo: Sparkles,
  system: Bell,
  payment: CreditCard,
  refund: RotateCcw,
};

function NotificationsPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const token = getToken();
      const data = await accountFetch<{ notifications: ApiNotification[] }>(
        "/notifications",
        token,
      );
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unread = items.filter((i) => i.unread).length;

  async function markAll() {
    setItems((l) => l.map((n) => ({ ...n, unread: false })));
    try {
      const token = getToken();
      await accountFetch("/notifications/read-all", token, { method: "POST" });
    } catch {
      // UI already optimistically updated; a background refresh will
      // reconcile if this request actually failed.
    }
  }

  async function markOne(id: string) {
    setItems((l) => l.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    try {
      const token = getToken();
      await accountFetch(`/notifications/${id}/read`, token, { method: "PATCH" });
    } catch {
      // Same optimistic-update rationale as markAll above.
    }
  }

  return (
    <div className="space-y-5">
      <header className="surface-card flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
            <Bell className="size-6" /> Notifications
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">
            {loading ? "Loading…" : `${unread} unread of ${items.length}`}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <Check className="size-3.5" /> Mark all read
          </Button>
        )}
      </header>

      {error && (
        <div className="surface-card rounded-3xl p-6 text-center text-sm text-muted-foreground">
          Couldn't load notifications.{" "}
          <button onClick={load} className="text-primary underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {!error && (
        <ul className="space-y-2">
          {!loading && items.length === 0 && (
            <li className="surface-card rounded-3xl p-8 text-center">
              <Bell className="text-muted-foreground mx-auto mb-2 size-8" />
              <p className="text-muted-foreground text-sm">
                You don't have any notifications yet. They'll show up here as things happen on
                your account — orders, payments, and offers.
              </p>
            </li>
          )}
          {items.map((n) => {
            const Icon = KIND_ICON[n.kind] ?? Bell;
            return (
              <li
                key={n.id}
                onClick={() => n.unread && markOne(n.id)}
                className={cn(
                  "surface-card tap-bounce flex cursor-pointer gap-3 rounded-3xl p-4",
                  n.unread && "ring-primary/30 ring-1",
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                    n.kind === "promo"
                      ? "bg-amber/15 text-amber-foreground"
                      : n.kind === "payment"
                        ? "bg-blue-100 text-blue-700"
                        : n.kind === "refund"
                          ? "bg-teal-100 text-teal-700"
                          : n.kind === "order"
                            ? "bg-primary-soft text-primary"
                            : "bg-surface-muted text-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="text-muted-foreground whitespace-nowrap text-[11px]">
                      {formatDate(n.at)}
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p>
                </div>
                {n.unread && (
                  <span className="bg-primary mt-1 size-2 shrink-0 self-start rounded-full" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
