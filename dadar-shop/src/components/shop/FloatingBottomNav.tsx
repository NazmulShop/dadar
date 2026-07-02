import { Home, Search, ShoppingBag, Heart, User } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useShop } from "@/lib/shopStore";
import { useAuth } from "@/lib/authStore";

export function FloatingBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useShop();
  const { isAuthenticated } = useAuth();
  const cartCount = state.cart.reduce((s, l) => s + l.qty, 0);
  const wishlistCount = state.wishlist.length;

  // Authenticated users go to /profile; guests go to login.
  const profileTo = isAuthenticated ? ("/profile" as const) : ("/auth/login" as const);

  // Active state logic per nav item — centralized here to avoid bugs.
  const isItemActive = (id: string, to: string, match: string): boolean => {
    switch (id) {
      case "home":
        return pathname === "/";
      case "search":
        // Shop icon active on /shop/* and /product/* pages.
        return pathname.startsWith("/shop") || pathname.startsWith("/product");
      case "cart":
        return pathname.startsWith("/cart") || pathname.startsWith("/checkout");
      case "wishlist":
        return pathname.startsWith("/wishlist");
      case "profile":
        // Profile icon active on both /profile and /account/* pages.
        return (
          pathname.startsWith("/profile") ||
          pathname.startsWith("/account")
        );
      default:
        return match === "exact" ? pathname === to : pathname.startsWith(to);
    }
  };

  const items = [
    { id: "home", label: "Home", icon: Home, to: "/" as const, match: "exact" as const },
    { id: "search", label: "Shop", icon: Search, to: "/shop" as const, match: "prefix" as const },
    {
      id: "cart",
      label: "Cart",
      icon: ShoppingBag,
      to: "/cart" as const,
      match: "prefix" as const,
      badge: cartCount || undefined,
    },
    {
      id: "wishlist",
      label: "Wishlist",
      icon: Heart,
      to: "/wishlist" as const,
      match: "prefix" as const,
      badge: wishlistCount || undefined,
    },
    {
      id: "profile",
      label: isAuthenticated ? "Profile" : "Sign in",
      icon: User,
      to: profileTo,
      match: "prefix" as const,
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass animate-float-pulse pointer-events-auto flex items-center gap-1 rounded-pill p-1.5 shadow-float">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.id, item.to, item.match);
          return (
            <Link
              key={item.id}
              to={item.to}
              className={cn(
                "tap-bounce relative flex h-10 items-center justify-center gap-1.5 rounded-pill px-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground px-3.5 shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--color-primary)_70%,transparent)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-[18px]" strokeWidth={isActive ? 2.4 : 2} />
              {isActive && <span className="text-[12px]">{item.label}</span>}
              {item.badge != null && (
                <span className="bg-coral text-coral-foreground absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
