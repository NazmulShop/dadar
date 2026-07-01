// Marketing data: coupons, promo codes, gift cards, cashback, affiliate, push.

// Coupons are defined once in lib/shopStore.tsx (the single source of
// truth checkout validates against) and re-exported here so this page
// never shows a coupon code that wouldn't actually work at checkout.
export { COUPONS, type Coupon } from "@/lib/shopStore";

export interface PromoCode {
  code: string;
  campaign: string;
  perks: string;
  expiresAt: string;
  uses: number;
  limit: number;
}

/** Populated from API — empty until backend marketing module is implemented */
export const PROMO_CODES: PromoCode[] = [];

export interface GiftCard {
  id: string;
  code: string;
  type: "delivery_free" | "delivery_discount" | "store_credit";
  value: number;
  description: string;
  expiresAt: string;
  balance: number;
}

/** Populated from API — empty until backend gift card module is implemented */
export const GIFT_CARDS: GiftCard[] = [];

export interface CashbackTier {
  name: "Silver" | "Gold" | "Platinum";
  rate: number; // %
  minSpend: number; // last 90 days
}

export const CASHBACK_TIERS: CashbackTier[] = [
  { name: "Silver", rate: 1, minSpend: 0 },
  { name: "Gold", rate: 2.5, minSpend: 10000 },
  { name: "Platinum", rate: 5, minSpend: 30000 },
];

export interface CashbackEntry {
  id: string;
  orderId: string;
  amount: number;
  at: string;
  status: "pending" | "credited";
}

/** Populated from API — empty until backend cashback module is implemented */
export const CASHBACK_HISTORY: CashbackEntry[] = [];

export const CASHBACK_WALLET = 0;

export interface PushPreference {
  key: "orders" | "promos" | "delivery" | "rewards" | "support";
  label: string;
  description: string;
  enabled: boolean;
}

export const PUSH_PREFERENCES: PushPreference[] = [
  { key: "orders", label: "Order updates", description: "Placed, packed, shipped & delivered.", enabled: true },
  { key: "delivery", label: "Delivery alerts", description: "Rider on the way, ETA changes.", enabled: true },
  { key: "promos", label: "Promotions & flash sales", description: "Exclusive coupon drops.", enabled: true },
  { key: "rewards", label: "Reward points", description: "Earned, expiring & tier upgrades.", enabled: false },
  { key: "support", label: "Support replies", description: "Ticket responses from our team.", enabled: true },
];