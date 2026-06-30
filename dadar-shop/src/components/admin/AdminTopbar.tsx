import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Mail, MoreVertical, Search, ShoppingBag, Star, User, Wifi, WifiOff, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/authStore";
import { useAdminWS } from "@/hooks/useAdminWS";

export function AdminTopbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, connected, markAllRead } = useAdminWS();
  const [notifOpen, setNotifOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  const initials = (user?.name ?? "DS")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function handleLogout() {
    await logout();
    navigate({ to: "/auth/login" });
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-border/50 bg-background/60 px-4 backdrop-blur-xl sm:px-6">
      <SidebarTrigger className="md:hidden" />

      {/* Welcome */}
      <div className="hidden min-w-0 md:block">
        <div className="text-xs text-muted-foreground">Welcome back,</div>
        <div className="flex items-center gap-1.5 font-display text-xl font-bold text-foreground">
          {user?.name ?? "Admin"} <span className="text-base">👋</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mx-auto hidden w-full max-w-xl md:block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders, products, customers…"
          className="h-11 rounded-full border-[oklch(0.68_0.26_305/0.3)] bg-card/40 pl-11 pr-16 text-sm shadow-[inset_0_0_0_1px_oklch(0.68_0.26_305/0.15),0_0_24px_-12px_oklch(0.68_0.26_305/0.5)] focus-visible:border-[oklch(0.68_0.26_305/0.6)] focus-visible:shadow-[inset_0_0_0_1px_oklch(0.68_0.26_305/0.5),0_0_28px_-8px_oklch(0.68_0.26_305/0.7)]"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Live status */}
        <span
          title={connected ? "Live updates connected" : "Reconnecting…"}
          className={cn(
            "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex",
            connected
              ? "bg-[oklch(0.82_0.22_150/0.15)] text-[oklch(0.82_0.22_150)]"
              : "bg-[oklch(0.68_0.25_18/0.15)] text-[oklch(0.78_0.22_18)]",
          )}
        >
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3 animate-pulse" />}
          {connected ? "Live" : "Reconnecting"}
        </span>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost" size="icon"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative h-11 w-11 rounded-full border border-border/60 bg-card/40 hover:border-[oklch(0.72_0.28_350/0.5)] hover:shadow-[0_0_18px_-6px_oklch(0.72_0.28_350/0.7)]"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full border-2 border-background bg-[oklch(0.68_0.25_18)] px-1 text-[10px] font-bold text-white shadow-[0_0_10px_oklch(0.68_0.25_18/0.8)]">
                {unread > 9 ? "9+" : unread}
              </Badge>
            )}
          </Button>
          {notifOpen && (
            <NotificationPanel
              notifications={notifications}
              onMarkAllRead={markAllRead}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        {/* Mail icon (decorative, nexora parity) */}
        <Button
          variant="ghost" size="icon"
          className="relative h-11 w-11 rounded-full border border-border/60 bg-card/40 hover:border-[oklch(0.82_0.16_200/0.5)] hover:shadow-[0_0_18px_-6px_oklch(0.82_0.16_200/0.7)]"
        >
          <Mail className="h-[18px] w-[18px]" />
        </Button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex cursor-pointer items-center">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-[oklch(0.68_0.26_305)] to-[oklch(0.72_0.28_350)] opacity-80 blur-sm" />
              <Avatar className="relative h-11 w-11 ring-2 ring-background">
                <AvatarFallback className="bg-gradient-to-br from-[oklch(0.4_0.15_280)] to-[oklch(0.3_0.1_260)] text-sm font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-[oklch(0.82_0.22_150)] shadow-[0_0_8px_oklch(0.82_0.22_150)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/account"><User className="mr-2 h-4 w-4" /> My account</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

/* ── Notification panel ── */
function NotificationPanel({
  notifications, onMarkAllRead, onClose,
}: {
  notifications: { id: string; type: "order" | "review"; title: string; body: string; at: string; read: boolean }[];
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">Live notifications</span>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={onMarkAllRead} className="text-[11px] text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          )}
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
      </div>
      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {notifications.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</li>
        )}
        {notifications.map((n) => (
          <li key={n.id} className={cn("px-4 py-3 text-sm", !n.read && "bg-primary/5")}>
            <div className="flex items-start gap-2">
              {n.type === "order"
                ? <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                : <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
              <div className="min-w-0">
                <div className="truncate font-semibold">{n.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">{n.body}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{new Date(n.at).toLocaleTimeString()}</div>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
