import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  Gift,
  Heart,
  LifeBuoy,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Package,
  Receipt,
  RotateCcw,
  Star,
  Truck,
  User,
  Wallet,
} from "lucide-react";


import { StickyHeader } from "@/components/shop/StickyHeader";
import { FloatingBottomNav } from "@/components/shop/FloatingBottomNav";
import { useAuth } from "@/lib/authStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your Account — Dadar Shop" },
      {
        name: "description",
        content:
          "Manage your profile, orders, addresses, wishlist, reviews, support and reward points.",
      },
    ],
  }),
  component: AccountLayout,
});

const NAV = [
  { to: "/account" as const, label: "Overview", icon: User, exact: true },
  { to: "/account/profile" as const, label: "Profile", icon: User },
  { to: "/account/orders" as const, label: "Orders", icon: Package },
  { to: "/account/refunds" as const, label: "Refunds", icon: RotateCcw },
  { to: "/account/delivery" as const, label: "Delivery", icon: Truck },
  { to: "/account/transactions" as const, label: "Transactions", icon: Receipt },
  { to: "/account/payouts" as const, label: "Payout methods", icon: Wallet },
  { to: "/account/marketing" as const, label: "Marketing", icon: Megaphone },

  { to: "/admin" as const, label: "Admin Dashboard", icon: LayoutDashboard },
  { to: "/account/wishlist" as const, label: "Wishlist", icon: Heart },
  { to: "/account/addresses" as const, label: "Addresses", icon: MapPin },
  { to: "/account/notifications" as const, label: "Notifications", icon: Bell },
  { to: "/account/reviews" as const, label: "Reviews", icon: Star },
  { to: "/account/support" as const, label: "Support", icon: LifeBuoy },
  { to: "/account/rewards" as const, label: "Rewards", icon: Gift },
];

function AccountLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useAuth();
  const isRoot = pathname === "/account" || pathname === "/account/";
  const visibleNav = NAV.filter((n) => n.to !== "/admin" || isAdmin);

  return (
    <div className="bg-background min-h-screen pb-40">
      <StickyHeader />
      <div className="mx-auto w-full max-w-[1080px] px-4 pt-2">
        {!isRoot && (
          <Link
            to="/account"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-xs"
          >
            <ChevronLeft className="size-3.5" /> Back to account
          </Link>
        )}

        <div className="grid gap-5 md:grid-cols-[240px_1fr]">
          <aside className="surface-card hidden h-fit rounded-3xl p-2 md:block">
            <nav className="flex flex-col gap-0.5">
              {visibleNav.map((n) => {
                const active = n.exact
                  ? pathname === n.to || pathname === `${n.to}/`
                  : pathname === n.to || pathname.startsWith(`${n.to}/`);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-surface-muted",
                    )}
                  >
                    <Icon className="size-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <FloatingBottomNav />
    </div>
  );
}
