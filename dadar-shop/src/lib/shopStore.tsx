import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { type CatalogProduct } from "@/data/products";

export interface CartLine {
  id: string; // product id
  qty: number;
}

export interface Coupon {
  code: string;
  label: string;
  kind: "percent" | "flat" | "freeship";
  value: number; // % or flat amount
  minSubtotal?: number;
  /** Optional richer marketing metadata, shown on /account/marketing. */
  title?: string;
  description?: string;
  maxDiscount?: number;
  expiresAt?: string;
  category?: string;
}

// Single source of truth for all coupons — both the marketing page
// (account.marketing.tsx) and the actual checkout discount logic read from
// this same array, so every coupon shown to the user is guaranteed to be
// redeemable. (Previously marketing.ts defined a second, separate COUPONS
// array with different codes that checkout never recognized.)
export const COUPONS: Coupon[] = [
  { code: "SAVE10", label: "10% off your order", kind: "percent", value: 10 },
  { code: "FLAT500", label: "৳500 off (min ৳3,000)", kind: "flat", value: 500, minSubtotal: 3000 },
  { code: "FREESHIP", label: "Free shipping", kind: "freeship", value: 0 },
  {
    code: "WELCOME15",
    label: "Welcome 15% off",
    kind: "percent",
    value: 15,
    minSubtotal: 1000,
    title: "Welcome 15% off",
    description: "First-time buyers only. Sitewide.",
    maxDiscount: 500,
    expiresAt: "2026-07-31",
  },
  {
    code: "EID200",
    label: "৳200 Eid Bonus",
    kind: "flat",
    value: 200,
    minSubtotal: 2000,
    title: "৳200 Eid Bonus",
    description: "Flat ৳200 off on orders above ৳2,000.",
    expiresAt: "2026-06-30",
  },
  {
    code: "SAREE25",
    label: "Saree edit 25% off",
    kind: "percent",
    value: 25,
    minSubtotal: 1500,
    title: "Saree edit 25% off",
    description: "Applies to Sarees & ethnic wear only.",
    maxDiscount: 800,
    expiresAt: "2026-07-15",
    category: "Sharee",
  },
];

export interface ShippingOption {
  id: string;
  label: string;
  eta: string;
  cost: number; // 0 means free, computed dynamically below as well
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: "standard", label: "Standard", eta: "3–5 days", cost: 60 },
  { id: "express", label: "Express", eta: "1–2 days", cost: 150 },
  { id: "sameday", label: "Same-day (Dhaka)", eta: "Today", cost: 300 },
];

export const FREE_SHIPPING_THRESHOLD = 5000;

interface ShopState {
  cart: CartLine[];
  saved: CartLine[]; // save-for-later
  wishlist: string[]; // product ids
  couponCode: string | null;
  shippingId: string;
}

const initial: ShopState = {
  cart: [],
  saved: [],
  wishlist: [],
  couponCode: null,
  shippingId: "standard",
};

type Action =
  | { type: "hydrate"; state: ShopState }
  | { type: "addToCart"; id: string; qty?: number }
  | { type: "setQty"; id: string; qty: number }
  | { type: "removeFromCart"; id: string }
  | { type: "clearCart" }
  | { type: "moveCartToSaved"; id: string }
  | { type: "moveSavedToCart"; id: string }
  | { type: "removeSaved"; id: string }
  | { type: "moveCartToWishlist"; id: string }
  | { type: "toggleWishlist"; id: string }
  | { type: "addToWishlist"; id: string }
  | { type: "removeFromWishlist"; id: string }
  | { type: "moveWishlistToCart"; id: string }
  | { type: "applyCoupon"; code: string | null }
  | { type: "setShipping"; id: string };

function bump(list: CartLine[], id: string, qty: number) {
  const i = list.findIndex((l) => l.id === id);
  if (i === -1) return qty > 0 ? [...list, { id, qty }] : list;
  const next = list.slice();
  const newQty = next[i].qty + qty;
  if (newQty <= 0) {
    next.splice(i, 1);
    return next;
  }
  next[i] = { ...next[i], qty: newQty };
  return next;
}

function reducer(state: ShopState, action: Action): ShopState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "addToCart":
      return { ...state, cart: bump(state.cart, action.id, action.qty ?? 1) };
    case "setQty":
      return {
        ...state,
        cart: state.cart
          .map((l) => (l.id === action.id ? { ...l, qty: Math.max(1, action.qty) } : l))
          .filter((l) => l.qty > 0),
      };
    case "removeFromCart":
      return { ...state, cart: state.cart.filter((l) => l.id !== action.id) };
    case "clearCart":
      return { ...state, cart: [], couponCode: null };
    case "moveCartToSaved": {
      const line = state.cart.find((l) => l.id === action.id);
      if (!line) return state;
      return {
        ...state,
        cart: state.cart.filter((l) => l.id !== action.id),
        saved: bump(
          state.saved.filter((l) => l.id !== action.id),
          action.id,
          line.qty,
        ),
      };
    }
    case "moveSavedToCart": {
      const line = state.saved.find((l) => l.id === action.id);
      if (!line) return state;
      return {
        ...state,
        saved: state.saved.filter((l) => l.id !== action.id),
        cart: bump(state.cart, action.id, line.qty),
      };
    }
    case "removeSaved":
      return { ...state, saved: state.saved.filter((l) => l.id !== action.id) };
    case "moveCartToWishlist":
      return {
        ...state,
        cart: state.cart.filter((l) => l.id !== action.id),
        wishlist: state.wishlist.includes(action.id)
          ? state.wishlist
          : [action.id, ...state.wishlist],
      };
    case "toggleWishlist":
      return {
        ...state,
        wishlist: state.wishlist.includes(action.id)
          ? state.wishlist.filter((x) => x !== action.id)
          : [action.id, ...state.wishlist],
      };
    case "addToWishlist":
      return {
        ...state,
        wishlist: state.wishlist.includes(action.id)
          ? state.wishlist
          : [action.id, ...state.wishlist],
      };
    case "removeFromWishlist":
      return { ...state, wishlist: state.wishlist.filter((x) => x !== action.id) };
    case "moveWishlistToCart":
      return {
        ...state,
        wishlist: state.wishlist.filter((x) => x !== action.id),
        cart: bump(state.cart, action.id, 1),
      };
    case "applyCoupon":
      return { ...state, couponCode: action.code };
    case "setShipping":
      return { ...state, shippingId: action.id };
    default:
      return state;
  }
}

const KEY = "dadar.shop.v1";

const ShopContext = createContext<{
  state: ShopState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ShopState>;
        dispatch({
          type: "hydrate",
          state: { ...initial, ...parsed },
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  return (
    <ShopContext.Provider value={{ state, dispatch }}>{children}</ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

// ─── Product cache (populated when products are viewed/added to cart) ────────

const productCache = new Map<string, CatalogProduct>();

export function cacheProduct(p: CatalogProduct) {
  productCache.set(p.id, p);
}

function getCachedProduct(id: string): CatalogProduct | undefined {
  return productCache.get(id);
}

export interface CartTotals {
  subtotal: number;
  itemCount: number;
  discount: number;
  shipping: number;
  shippingFreeApplied: boolean;
  total: number;
  coupon: Coupon | null;
  couponError: string | null;
  shippingOption: ShippingOption;
}

export function useCartTotals(): CartTotals {
  const { state } = useShop();
  return useMemo(() => {
    const detailed = state.cart
      .map((l) => ({ line: l, product: getCachedProduct(l.id) }))
      .filter((x) => x.product) as { line: CartLine; product: CatalogProduct }[];

    // Fall back to stored price in cart line if product not in cache
    const subtotal = state.cart.reduce((s, l) => {
      const p = getCachedProduct(l.id);
      return s + (p ? p.price : (l as any).price ?? 0) * l.qty;
    }, 0);
    const itemCount = state.cart.reduce((s, l) => s + l.qty, 0);

    const coupon = state.couponCode
      ? (COUPONS.find((c) => c.code === state.couponCode) ?? null)
      : null;

    let discount = 0;
    let couponError: string | null = null;
    let freeShipFromCoupon = false;
    if (coupon) {
      const eligibleSubtotal = coupon.category
        ? detailed
            .filter((x) => x.product.subcategory === coupon.category || x.product.category === coupon.category)
            .reduce((s, x) => s + x.product.price * x.line.qty, 0)
        : subtotal;

      const expired = coupon.expiresAt ? new Date(coupon.expiresAt).getTime() < Date.now() : false;
      if (expired) {
        couponError = `${coupon.code} has expired`;
      } else if (coupon.category && eligibleSubtotal === 0) {
        couponError = `${coupon.code} only applies to ${coupon.category} items`;
      } else if (coupon.minSubtotal && eligibleSubtotal < coupon.minSubtotal) {
        couponError = `Add ৳${(coupon.minSubtotal - eligibleSubtotal).toLocaleString()} more ${coupon.category ? `of ${coupon.category} ` : ""}to use ${coupon.code}`;
      } else if (coupon.kind === "percent") {
        discount = Math.round((eligibleSubtotal * coupon.value) / 100);
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      } else if (coupon.kind === "flat") {
        discount = Math.min(coupon.value, eligibleSubtotal);
      } else if (coupon.kind === "freeship") {
        freeShipFromCoupon = true;
      }
    }

    const shippingOption =
      SHIPPING_OPTIONS.find((o) => o.id === state.shippingId) ?? SHIPPING_OPTIONS[0];

    const freeFromThreshold = subtotal >= FREE_SHIPPING_THRESHOLD && shippingOption.id === "standard";
    const shippingFreeApplied = subtotal > 0 && (freeShipFromCoupon || freeFromThreshold);
    const shipping = subtotal === 0 ? 0 : shippingFreeApplied ? 0 : shippingOption.cost;

    const total = Math.max(0, subtotal - discount + shipping);

    return {
      subtotal,
      itemCount,
      discount,
      shipping,
      shippingFreeApplied,
      total,
      coupon,
      couponError,
      shippingOption,
    };
  }, [state]);
}

export function useCartLines() {
  const { state } = useShop();
  return useMemo(
    () =>
      state.cart
        .map((line) => ({ line, product: getCachedProduct(line.id) }))
        .filter((x) => x.product) as { line: CartLine; product: CatalogProduct }[],
    [state.cart],
  );
}

export function useSavedLines() {
  const { state } = useShop();
  return useMemo(
    () =>
      state.saved
        .map((line) => ({ line, product: getCachedProduct(line.id) }))
        .filter((x) => x.product) as { line: CartLine; product: CatalogProduct }[],
    [state.saved],
  );
}

export function useWishlistProducts() {
  const { state } = useShop();
  return useMemo(
    () => state.wishlist.map((id) => getCachedProduct(id)).filter((p): p is CatalogProduct => !!p),
    [state.wishlist],
  );
}

export function useIsWishlisted(id: string) {
  const { state } = useShop();
  return state.wishlist.includes(id);
}

export function useShopActions() {
  const { dispatch } = useShop();
  return useMemo(
    () => ({
      addToCart: (id: string, qty = 1) => dispatch({ type: "addToCart", id, qty }),
      setQty: (id: string, qty: number) => dispatch({ type: "setQty", id, qty }),
      removeFromCart: (id: string) => dispatch({ type: "removeFromCart", id }),
      clearCart: () => dispatch({ type: "clearCart" }),
      moveCartToSaved: (id: string) => dispatch({ type: "moveCartToSaved", id }),
      moveSavedToCart: (id: string) => dispatch({ type: "moveSavedToCart", id }),
      removeSaved: (id: string) => dispatch({ type: "removeSaved", id }),
      moveCartToWishlist: (id: string) => dispatch({ type: "moveCartToWishlist", id }),
      toggleWishlist: (id: string) => dispatch({ type: "toggleWishlist", id }),
      addToWishlist: (id: string) => dispatch({ type: "addToWishlist", id }),
      removeFromWishlist: (id: string) => dispatch({ type: "removeFromWishlist", id }),
      moveWishlistToCart: (id: string) => dispatch({ type: "moveWishlistToCart", id }),
      applyCoupon: (code: string | null) => dispatch({ type: "applyCoupon", code }),
      setShipping: (id: string) => dispatch({ type: "setShipping", id }),
    }),
    [dispatch],
  );
}

export const _useCallbackMarker = useCallback; // tree-shake-safe re-export keeper
