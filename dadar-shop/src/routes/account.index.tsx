import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Gift,
  Heart,
  LifeBuoy,
  MapPin,
  Megaphone,
  Package,
  Receipt,
  RotateCcw,
  Star,
  User,
  type LucideIcon,
} from "lucide-react";

import { formatBDT } from "@/data/account";
import { useShop } from "@/lib/shopStore";
import { useAuth } from "@/lib/authStore";
import { accountFetch, API_ORIGIN } from "@/lib/accountApi";

export const Route = createFileRoute("/account/")({
  component: AccountOverview,
});

interface Tile {
  to:
    | "/account/profile"
    | "/account/orders"
    | "/account/refunds"
    | "/account/transactions"
    | "/account/marketing"
    | "/account/wishlist"
    | "/account/addresses"
    | "/account/notifications"
    | "/account/reviews"
    | "/account/support"
    | "/account/rewards";
  label: string;
  icon: LucideIcon;
  hint: string;
  badge?: string | number;
}

interface RecentOrder {
  id: string;
  status: string;
  total: number;
  shipTo: { line1: string; area: string; city: string; phone: string };
}

function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function memberSince(createdAtMs: number) {
  return new Date(createdAtMs).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function AccountOverview() {
  const { state } = useShop();
  const { user, getToken } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [refundCount, setRefundCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [rewardBalance, setRewardBalance] = useState(0);
  const [rewardTier, setRewardTier] = useState("Bronze");

  useEffect(() => {
    const token = getToken();

    accountFetch<{ notifications: { unread: boolean }[] }>("/notifications", token)
      .then((d) => {
        if (Array.isArray(d.notifications)) {
          setUnreadCount(d.notifications.filter((n) => n.unread).length);
        }
      })
      .catch(() => {});

    accountFetch<{ orders: RecentOrder[] }>("/orders", token)
      .then((d) => {
        if (Array.isArray(d.orders)) {
          setOrderCount(d.orders.length);
          setRecentOrders(d.orders.slice(0, 3));
        }
      })
      .catch(() => {});

    accountFetch<{ addresses: unknown[] }>("/addresses", token)
      .then((d) => Array.isArray(d.addresses) && setAddressCount(d.addresses.length))
      .catch(() => {});

    accountFetch<{ reviews: unknown[] }>("/reviews", token)
      .then((d) => Array.isArray(d.reviews) && setReviewCount(d.reviews.length))
      .catch(() => {});

    accountFetch<{ balance: number; tier: string }>("/rewards", token)
      .then((d) => {
        if (typeof d.balance === "number") setRewardBalance(d.balance);
        if (typeof d.tier === "string") setRewardTier(d.tier);
      })
      .catch(() => {});

    fetch(`${API_ORIGIN}/api/support/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(
        (d) =>
          Array.isArray(d) &&
          setTicketCount(
            d.filter((t: { status: string }) => t.status !== "Resolved" && t.status !== "Closed")
              .length,
          ),
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tiles: Tile[] = [
    { to: "/account/profile", label: "Profile", icon: User, hint: "Personal details" },
    {
      to: "/account/orders",
      label: "Orders",
      icon: Package,
      hint: "Track & manage",
      badge: orderCount || undefined,
    },
    {
      to: "/account/refunds",
      label: "Refunds",
      icon: RotateCcw,
      hint: "Returns & tracking",
      badge: refundCount || undefined,
    },
    {
      to: "/account/transactions",
      label: "Transaction history",
      icon: Receipt,
      hint: "Payments & refunds",
    },
    {
      to: "/account/marketing",
      label: "Marketing",
      icon: Megaphone,
      hint: "Coupons & rewards",
    },
    {
      to: "/account/wishlist",
      label: "Wishlist",
      icon: Heart,
      hint: "Saved items",
      badge: state.wishlist.length || undefined,
    },
    {
      to: "/account/addresses",
      label: "Addresses",
      icon: MapPin,
      hint: "Delivery locations",
      badge: addressCount || undefined,
    },
    {
      to: "/account/notifications",
      label: "Notifications",
      icon: Bell,
      hint: "Updates & offers",
      badge: unreadCount || undefined,
    },
    {
      to: "/account/reviews",
      label: "Reviews",
      icon: Star,
      hint: "Your feedback",
      badge: reviewCount || undefined,
    },
    {
      to: "/account/support",
      label: "Support tickets",
      icon: LifeBuoy,
      hint: "Get help",
      badge: ticketCount || undefined,
    },
    {
      to: "/account/rewards",
      label: "Reward points",
      icon: Gift,
      hint: `${rewardBalance.toLocaleString()} pts`,
    },
  ];

  if (!user) return null;

  return (
    <div className="space-y-5">
      <section className="surface-card flex items-center gap-4 rounded-3xl p-5">
        <div className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full text-xl font-semibold">
          {avatarInitials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-display truncate text-xl font-semibold">{user.name}</h1>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="bg-amber/15 text-amber-foreground rounded-pill px-2 py-0.5 text-[10px] font-medium">
              {rewardTier} member
            </span>
            <span className="text-muted-foreground text-[11px]">
              Since {memberSince(user.createdAt)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-display text-xl font-semibold">
            {rewardBalance.toLocaleString()}
          </div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
            Reward pts
          </div>
        </div>
      </section>

      <section className="surface-card rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-display text-sm font-semibold">Recent orders</h2>
          <Link to="/account/orders" className="text-primary text-xs font-medium">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            No orders yet — your purchases will show up here.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3">
                <Link
                  to="/account/orders/$id"
                  params={{ id: o.id }}
                  className="min-w-0 flex-1"
                >
                  <div className="text-sm font-medium">{o.id}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {o.shipTo.line1}, {o.shipTo.area}
                  </div>
                </Link>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatBDT(o.total)}</div>
                  <div className="text-muted-foreground text-[11px]">{o.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="surface-card hover:shadow-card group relative flex flex-col gap-1 rounded-3xl p-4 transition"
            >
              <div className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-2xl">
                <Icon className="size-5" />
              </div>
              <div className="mt-2 text-sm font-semibold">{t.label}</div>
              <div className="text-muted-foreground text-[11px]">{t.hint}</div>
              {t.badge !== undefined && (
                <span className="bg-primary text-primary-foreground absolute right-3 top-3 min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold">
                  {t.badge}
                </span>
              )}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
