import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  FileClock,
  LayoutDashboard,
  LogOut,
  Search,
  Shield,
  ShoppingBag,
  Star,
  Store,
  Tag,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
  CreditCard,
  MapPin,
  Ticket,
  Megaphone,
  Image,
  FileText,
  Gift,
  RefreshCcw,
  Heart,
  Layers,
  Zap,
  ShoppingCart,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook,
  Puzzle,
  Lock,
  Activity,
  AlertOctagon,
  Globe,
  BookOpen,
  HardDrive,
  Settings,
  Headphones,
  MessageCircle,
  ThumbsDown,
  Repeat,
  BarChart3,
  TrendingUp,
  Package,
  MousePointerClick,
  BookMarked,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/authStore";
import { useAdminWS } from "@/hooks/useAdminWS";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/* ─────────────────────────── Nav structure ─────────────────────────── */

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Core",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/customers", label: "Users", icon: Users },
      { to: "/admin/products", label: "Products", icon: Tag },
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/transactions", label: "Payments History", icon: CreditCard },
    ],
  },
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { to: "/admin/products", label: "Products", icon: Tag },
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/sellers", label: "Sellers", icon: Store },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/admin/transactions", label: "Payments History", icon: CreditCard },
      { to: "/admin/payment-methods", label: "Payment Methods", icon: CreditCard },
      { to: "/admin/payouts", label: "Payouts", icon: RefreshCcw },
      { to: "/admin/commissions", label: "Commissions", icon: Layers },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/admin/coupons", label: "Coupons", icon: Ticket },
      { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/admin/banners", label: "Banners", icon: Image },
      { to: "/admin/flash-sales", label: "Flash Sales", icon: Zap },
      { to: "/admin/gift-cards", label: "Gift Cards", icon: Gift },
    ],
  },
  {
    label: "Customers",
    items: [
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/segments", label: "Segments", icon: Layers },
      { to: "/admin/loyalty", label: "Loyalty Program", icon: Star },
      { to: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
      { to: "/admin/abandoned-carts", label: "Abandoned Carts", icon: ShoppingCart },
      { to: "/admin/wishlist-analytics", label: "Wishlist Analytics", icon: Heart },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/sales-analytics", label: "Sales Analytics", icon: TrendingUp },
      { to: "/admin/product-performance", label: "Product Performance", icon: Package },
      { to: "/admin/conversion-tracking", label: "Conversion Tracking", icon: MousePointerClick },
      { to: "/admin/search-analytics", label: "Search Analytics", icon: Search },
    ],
  },
  {
    label: "Shipping",
    items: [
      { to: "/admin/shipping-zones", label: "Shipping Zones", icon: MapPin },
    ],
  },
  {
    label: "Reviews & Content",
    items: [
      { to: "/admin/reviews", label: "Reviews & Ratings", icon: Star },
      { to: "/admin/reports", label: "Reports", icon: FileText },
      { to: "/admin/pages", label: "Pages (CMS)", icon: Globe },
      { to: "/admin/blog", label: "Blog / Articles", icon: BookOpen },
      { to: "/admin/media", label: "Media Library", icon: Image },
      { to: "/admin/seo", label: "SEO Settings", icon: BookMarked },
    ],
  },
  {
    label: "Automation",
    items: [
      { to: "/admin/automation-rules", label: "Automation Rules", icon: Activity },
      { to: "/admin/email-templates", label: "Email Templates", icon: Mail },
      { to: "/admin/sms-templates", label: "SMS Templates", icon: MessageSquare },
      { to: "/admin/push-notifications", label: "Push Notifications", icon: Smartphone },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Integrations",
    items: [
      { to: "/admin/api-management", label: "API Management", icon: Puzzle },
      { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
    ],
  },
  {
    label: "Support",
    items: [
      { to: "/admin/support-tickets", label: "Support Tickets", icon: Headphones },
      { to: "/admin/live-chat", label: "Live Chat", icon: MessageCircle },
      { to: "/admin/feedback", label: "Customer Feedback", icon: ThumbsDown },
      { to: "/admin/disputes", label: "Disputes / Returns", icon: AlertOctagon },
      { to: "/admin/refunds", label: "Refund Management", icon: RefreshCcw },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/admins", label: "Admin team", icon: Shield },
      { to: "/admin/activity-logs", label: "Activity logs", icon: FileClock },
      { to: "/admin/roles", label: "Roles & Permissions", icon: Lock },
      { to: "/admin/login-sessions", label: "Login Sessions", icon: User },
      { to: "/admin/security", label: "Security Settings", icon: Shield },
      { to: "/admin/fraud-detection", label: "Fraud Detection", icon: AlertOctagon },
      { to: "/admin/backup", label: "Backup & Restore", icon: HardDrive },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function pageTitle(pathname: string): string {
  const match = ALL_ITEMS.filter((i) => pathname === i.to || pathname.startsWith(i.to + "/"))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? "Dashboard";
}

/* ─────────────────────────────── Shell ─────────────────────────────── */

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { systemAlert, notifications, connected, markAllRead, dismissAlert } = useAdminWS();
  const [notifOpen, setNotifOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;
  const title = useMemo(() => pageTitle(location.pathname), [location.pathname]);
  const initials = (user?.name ?? "A")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logout();
    navigate({ to: "/auth/login" });
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="px-3 py-4">
          <Link to="/admin" className="flex items-center gap-2 px-1">
            <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
              DS
            </span>
            <span className="group-data-[collapsible=icon]:hidden">
              <span className="block text-sm font-semibold leading-tight text-sidebar-foreground">
                Dadar Shop
              </span>
              <span className="block text-[11px] leading-tight text-sidebar-foreground/60">
                Admin Console
              </span>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/50">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active =
                      location.pathname === item.to ||
                      (item.to !== "/admin" && location.pathname.startsWith(item.to + "/"));
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link to={item.to}>
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="px-3 pb-4">
          <Link
            to="/account"
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <User className="size-3.5 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Back to storefront</span>
          </Link>
        </SidebarFooter>
      </Sidebar>

      <div className="flex min-h-screen w-full flex-col bg-background">
        {systemAlert && (
          <SystemAlertBanner alert={systemAlert} onDismiss={dismissAlert} />
        )}

        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-display hidden text-base font-semibold sm:block">{title}</h1>

          <div className="relative ml-auto max-w-xs flex-1 sm:max-w-sm">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input placeholder="Search orders, products, customers…" className="h-9 pl-9" />
          </div>

          <span
            title={connected ? "Live updates connected" : "Reconnecting…"}
            className={cn(
              "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex",
              connected ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700",
            )}
          >
            {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3 animate-pulse" />}
            {connected ? "Live" : "Reconnecting"}
          </span>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="hover:bg-surface-muted relative inline-flex size-9 items-center justify-center rounded-xl transition"
              aria-label="Notifications"
            >
              {unread > 0 ? <Bell className="size-4.5 text-primary" /> : <BellOff className="size-4.5 text-muted-foreground" />}
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex size-4.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <NotificationPanel
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-surface-muted">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-medium leading-tight">{user?.name ?? "Admin"}</span>
                  <span className="block text-[10px] leading-tight text-muted-foreground">
                    {user?.role === "admin" ? "Administrator" : user?.role}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-muted-foreground text-xs">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/account">
                  <User className="size-4" /> My account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className={cn("flex-1", systemAlert?.severity === "critical" && "pointer-events-none select-none opacity-60")}>
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}

/* ───────────────────────── System alert banner ───────────────────────── */

function SystemAlertBanner({
  alert,
  onDismiss,
}: {
  alert: { severity: "warning" | "critical"; code: string; message: string; solution: string; at: string };
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isCritical = alert.severity === "critical";

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b-2 shadow-lg",
        isCritical ? "border-red-400 bg-red-600 text-white" : "border-amber-300 bg-amber-500 text-amber-950",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className={cn("mt-0.5 size-5 shrink-0 animate-pulse", isCritical ? "text-red-100" : "text-amber-900")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest",
                isCritical ? "bg-red-900/60 text-red-100" : "bg-amber-900/20 text-amber-950",
              )}
            >
              {isCritical ? "Critical" : "Warning"} · {alert.code}
            </span>
            <span className="text-[11px] opacity-70">{new Date(alert.at).toLocaleTimeString()}</span>
          </div>
          <p className={cn("mt-1 text-sm font-semibold", isCritical ? "text-white" : "text-amber-950")}>
            {alert.message}
          </p>
          {expanded && alert.solution && (
            <div
              className={cn(
                "mt-2 rounded-2xl px-4 py-3 text-sm",
                isCritical ? "bg-red-900/50 text-red-100" : "bg-amber-900/10 text-amber-950",
              )}
            >
              <span className="font-semibold">How to fix: </span>
              {alert.solution}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setExpanded((e) => !e)} className="rounded-xl p-1.5 transition hover:bg-white/10">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <button onClick={onDismiss} className="rounded-xl p-1.5 transition hover:bg-white/10" title="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Notification panel ─────────────────────────── */

function NotificationPanel({
  notifications,
  onMarkAllRead,
  onClose,
}: {
  notifications: { id: string; type: "order" | "review"; title: string; body: string; at: string; read: boolean }[];
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="surface-card border-border absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-3xl border shadow-2xl">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">Live notifications</span>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={onMarkAllRead} className="text-[11px] text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          )}
          <button onClick={onClose} aria-label="Close">
            <X className="text-muted-foreground size-4" />
          </button>
        </div>
      </div>
      <ul className="divide-border max-h-80 divide-y overflow-y-auto">
        {notifications.length === 0 && (
          <li className="text-muted-foreground py-8 text-center text-sm">No notifications yet.</li>
        )}
        {notifications.map((n) => (
          <li key={n.id} className={cn("px-4 py-3 text-sm", !n.read && "bg-primary/5")}>
            <div className="flex items-start gap-2">
              {n.type === "order" ? (
                <ShoppingBag className="mt-0.5 size-4 shrink-0 text-blue-600" />
              ) : (
                <Star className="mt-0.5 size-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0">
                <div className="truncate font-semibold">{n.title}</div>
                <div className="text-muted-foreground truncate text-[11px]">{n.body}</div>
                <div className="text-muted-foreground mt-0.5 text-[10px]">
                  {new Date(n.at).toLocaleTimeString()}
                </div>
              </div>
              {!n.read && <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
