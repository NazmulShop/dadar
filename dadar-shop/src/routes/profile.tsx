import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Heart, LogIn, LogOut, Package, Receipt, Settings, ShoppingBag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StickyHeader } from "@/components/shop/StickyHeader";
import { FloatingBottomNav } from "@/components/shop/FloatingBottomNav";
import { useShop } from "@/lib/shopStore";
import { useAuth } from "@/lib/authStore";
import { usePayments } from "@/lib/paymentStore";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Dadar Shop" },
      {
        name: "description",
        content:
          "Manage your Dadar Shop account, orders, wishlist and preferences in one place.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { state } = useShop();
  const { user, isAuthenticated, logout } = useAuth();
  const { state: payState } = usePayments();
  const nav = useNavigate();
  const cartCount = state.cart.reduce((s, l) => s + l.qty, 0);
  const wishlistCount = state.wishlist.length;
  const paymentsCount = payState.transactions.length;
  void state.saved.length;

  const handleLogout = () => {
    logout();
    nav({ to: "/" });
  };

  const tiles = [
    { label: "Your bag", icon: ShoppingBag, to: "/cart" as const, count: cartCount },
    { label: "Wishlist", icon: Heart, to: "/wishlist" as const, count: wishlistCount },
    { label: "Payments", icon: Receipt, to: "/payments" as const, count: paymentsCount },
  ];

  return (
    <div className="bg-background min-h-screen pb-40">
      <StickyHeader />
      <div className="mx-auto w-full max-w-[720px] px-4 pt-2">
        <section className="surface-card mb-4 flex items-center gap-3 rounded-3xl p-4">
          <div className="bg-primary-soft text-primary flex size-14 items-center justify-center rounded-full">
            <User className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-display truncate text-lg font-semibold">
              {isAuthenticated && user ? user.name : "Guest"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAuthenticated && user ? user.email : "Sign in to sync your bag, wishlist and orders."}
            </p>
          </div>
          {isAuthenticated ? (
            <Button size="sm" variant="outline" onClick={handleLogout}>
              <LogOut className="size-3.5" /> Sign out
            </Button>
          ) : (
            <Link to="/auth/login">
              <Button size="sm" variant="hero">
                <LogIn className="size-3.5" /> Sign in
              </Button>
            </Link>
          )}
        </section>

        <section className="grid grid-cols-3 gap-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.label}
                to={t.to}
                className="surface-card tap-scale tap-scale-active flex flex-col items-center gap-2 rounded-3xl p-4 text-center"
              >
                <div className="bg-primary-soft text-primary relative flex size-10 items-center justify-center rounded-full">
                  <Icon className="size-5" />
                  {t.count > 0 && (
                    <span className="bg-coral text-coral-foreground absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                      {t.count}
                    </span>
                  )}
                </div>
                <span className="text-[12px] font-medium">{t.label}</span>
              </Link>
            );
          })}
        </section>

        <section className="surface-card mt-4 rounded-3xl p-2">
          {[
            { label: "Account dashboard", icon: Settings, to: "/account" as const },
            { label: "Orders & tracking", icon: Package, to: "/account/orders" as const },
          ].map((row) => {
            const Icon = row.icon;
            return (
              <Link
                key={row.label}
                to={row.to}
                className="hover:bg-muted flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left"
              >
                <Icon className="text-muted-foreground size-4" />
                <span className="flex-1 text-sm font-medium">{row.label}</span>
                <span className="text-muted-foreground text-xs">Open →</span>
              </Link>
            );
          })}
        </section>
      </div>
      <FloatingBottomNav />
    </div>
  );
}
