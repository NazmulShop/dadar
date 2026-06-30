import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Star,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemAlert as SystemAlertType, Notification } from "@/hooks/useAdminWS";

interface Props {
  alert: SystemAlertType | null;
  notifications: Notification[];
  connected: boolean;
  onDismissAlert: () => void;
  onMarkAllRead: () => void;
  children: React.ReactNode;
}

export function AdminShell({
  alert,
  notifications,
  connected,
  onDismissAlert,
  onMarkAllRead,
  children,
}: Props) {
  const isCritical = alert?.severity === "critical";
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-700",
        alert
          ? isCritical
            ? "bg-red-950"
            : "bg-amber-950"
          : "bg-background",
      )}
    >
      {alert && <SystemAlertBanner alert={alert} onDismiss={onDismissAlert} />}
      <NotificationBar
        notifications={notifications}
        unread={unread}
        connected={connected}
        onMarkAllRead={onMarkAllRead}
      />
      <div className={cn(alert ? "opacity-60 pointer-events-none select-none" : undefined)}>
        {children}
      </div>
    </div>
  );
}

function SystemAlertBanner({ alert, onDismiss }: { alert: SystemAlertType; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const isCritical = alert.severity === "critical";

  return (
    <div
      className={cn(
        "sticky top-0 z-50 border-b-2 shadow-2xl",
        isCritical
          ? "bg-red-600 border-red-400 text-white"
          : "bg-amber-500 border-amber-300 text-amber-950",
      )}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className={cn("size-5 shrink-0 mt-0.5 animate-pulse", isCritical ? "text-red-100" : "text-amber-900")} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[11px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5", isCritical ? "bg-red-900/60 text-red-100" : "bg-amber-900/20 text-amber-950")}>
                {isCritical ? "Critical" : "Warning"} · {alert.code}
              </span>
              <span className="text-[11px] opacity-70">{new Date(alert.at).toLocaleTimeString()}</span>
            </div>

            <p className={cn("mt-1 text-sm font-semibold", isCritical ? "text-white" : "text-amber-950")}>
              {alert.message}
            </p>

            {expanded && alert.solution && (
              <div className={cn("mt-2 rounded-2xl px-4 py-3 text-sm", isCritical ? "bg-red-900/50 text-red-100" : "bg-amber-900/10 text-amber-950")}>
                <span className="font-semibold">How to fix: </span>{alert.solution}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded((e) => !e)}
              className={cn("rounded-xl p-1.5 transition hover:bg-white/10")}
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            <button
              onClick={onDismiss}
              className="rounded-xl p-1.5 transition hover:bg-white/10"
              title="Dismiss (will reappear if issue persists)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationBar({
  notifications,
  unread,
  connected,
  onMarkAllRead,
}: {
  notifications: Notification[];
  unread: number;
  connected: boolean;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-40 flex justify-end px-4 pt-2 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-2">
        <span
          title={connected ? "Live updates connected" : "Reconnecting…"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            connected
              ? "bg-emerald-100 text-emerald-800"
              : "bg-rose-100 text-rose-700",
          )}
        >
          {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3 animate-pulse" />}
          {connected ? "Live" : "Reconnecting"}
        </span>

        <button
          onClick={() => setOpen((o) => !o)}
          className="surface-card relative inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-medium shadow-sm"
        >
          {unread > 0 ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4 text-muted-foreground" />}
          <span>Alerts</span>
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="surface-card absolute right-4 top-10 z-50 w-80 rounded-3xl shadow-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Live notifications</span>
            <div className="flex gap-1.5">
              {unread > 0 && (
                <button onClick={onMarkAllRead} className="text-[11px] text-muted-foreground hover:text-foreground">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn("px-4 py-3 text-sm", !n.read && "bg-primary/5")}
              >
                <div className="flex items-start gap-2">
                  {n.type === "order" ? (
                    <ShoppingBag className="size-4 mt-0.5 text-blue-600 shrink-0" />
                  ) : (
                    <Star className="size-4 mt-0.5 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{n.title}</div>
                    <div className="text-muted-foreground text-[11px] truncate">{n.body}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.at).toLocaleTimeString()}
                    </div>
                  </div>
                  {!n.read && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 py-2 border-t border-border flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Zap className="size-3" />
            Real-time via WebSocket · health check every 15s
          </div>
        </div>
      )}
    </div>
  );
}
