import { useState } from "react";
import { Bell, ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SearchBar } from "./SearchBar";
import { SearchOverlay } from "./SearchOverlay";
import { ThemeToggle } from "./ThemeToggle";
import { useShop } from "@/lib/shopStore";

export function StickyHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { state } = useShop();
  const cartCount = state.cart.reduce((s, l) => s + l.qty, 0);

  return (
    <>
      <header className="glass sticky top-0 z-40 -mx-0 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_1px_0_color-mix(in_oklab,var(--color-border)_60%,transparent)]">
        <div className="flex items-center justify-between">
          <ThemeToggle variant="compact" />
          <div className="flex flex-col items-center leading-none">
            <span className="text-serif text-[20px] font-medium">Dadar</span>
            <span className="text-primary text-[9px] font-semibold uppercase tracking-[0.22em]">
              Shop
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/cart"
              aria-label="Cart"
              className="tap-scale tap-scale-active bg-surface/70 relative flex size-10 items-center justify-center rounded-pill border border-border"
            >
              <ShoppingBag className="size-[18px]" strokeWidth={2.25} />
              {cartCount > 0 && (
                <span className="bg-coral text-coral-foreground absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              to="/account/notifications"
              aria-label="Notifications"
              className="tap-scale tap-scale-active bg-surface/70 relative flex size-10 items-center justify-center rounded-pill border border-border"
            >
              <Bell className="size-[18px]" strokeWidth={2.25} />
              <span className="bg-coral absolute right-2.5 top-2.5 size-2 rounded-full ring-2 ring-surface" />
            </Link>
          </div>
        </div>
        <div className="mt-3">
          <SearchBar onOpen={() => setSearchOpen(true)} />
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
