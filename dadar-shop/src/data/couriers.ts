// Delivery / courier configuration for Dadar Shop.
// Supports the major Bangladeshi couriers used by the storefront.

export type CourierId =
  | "Pathao"
  | "RedX"
  | "Steadfast"
  | "Paperfly"
  | "Sundarban"
  | "eCourier";

export type DeliveryZone = "inside_dhaka" | "sub_dhaka" | "outside_dhaka";

export interface CourierConfig {
  id: CourierId;
  name: string;
  /** Short brand color (oklch / hex). */
  accent: string;
  /** Per-zone base charge for up to 1kg (BDT). */
  baseCharge: Record<DeliveryZone, number>;
  /** BDT per additional kg above 1kg. */
  perKg: number;
  /** Estimated delivery window in days (min, max). */
  etaDays: [number, number];
  /** Returns a public tracking URL for a tracking number. */
  trackingUrl: (tracking: string) => string;
  /** Phone / support hotline. */
  hotline: string;
  /** Two-letter prefix used when generating tracking numbers. */
  prefix: string;
}

export const COURIERS: Record<CourierId, CourierConfig> = {
  Pathao: {
    id: "Pathao",
    name: "Pathao Courier",
    accent: "#E81D4F",
    baseCharge: { inside_dhaka: 60, sub_dhaka: 100, outside_dhaka: 130 },
    perKg: 20,
    etaDays: [1, 3],
    trackingUrl: (t) => `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(t)}`,
    hotline: "09678-100800",
    prefix: "PTH",
  },
  RedX: {
    id: "RedX",
    name: "RedX",
    accent: "#EE1C25",
    baseCharge: { inside_dhaka: 65, sub_dhaka: 110, outside_dhaka: 135 },
    perKg: 15,
    etaDays: [1, 3],
    trackingUrl: (t) => `https://redx.com.bd/track-parcel/?trackingId=${encodeURIComponent(t)}`,
    hotline: "09617-666333",
    prefix: "RDX",
  },
  Steadfast: {
    id: "Steadfast",
    name: "SteadFast Courier",
    accent: "#0E7C66",
    baseCharge: { inside_dhaka: 60, sub_dhaka: 100, outside_dhaka: 120 },
    perKg: 15,
    etaDays: [1, 4],
    trackingUrl: (t) => `https://steadfast.com.bd/t/${encodeURIComponent(t)}`,
    hotline: "09610-001370",
    prefix: "STF",
  },
  Paperfly: {
    id: "Paperfly",
    name: "Paperfly",
    accent: "#0A6BB8",
    baseCharge: { inside_dhaka: 70, sub_dhaka: 110, outside_dhaka: 130 },
    perKg: 20,
    etaDays: [2, 5],
    trackingUrl: (t) => `https://go.paperfly.com.bd/customer-info-list?reference=${encodeURIComponent(t)}`,
    hotline: "09612-202020",
    prefix: "PPF",
  },
  Sundarban: {
    id: "Sundarban",
    name: "Sundarban Courier",
    accent: "#1F7A3A",
    baseCharge: { inside_dhaka: 80, sub_dhaka: 120, outside_dhaka: 150 },
    perKg: 18,
    etaDays: [2, 6],
    trackingUrl: (t) => `https://sundarbancourierltd.com/tracking?cn=${encodeURIComponent(t)}`,
    hotline: "09613-787800",
    prefix: "SCL",
  },
  eCourier: {
    id: "eCourier",
    name: "eCourier",
    accent: "#F5A623",
    baseCharge: { inside_dhaka: 70, sub_dhaka: 110, outside_dhaka: 140 },
    perKg: 20,
    etaDays: [1, 4],
    trackingUrl: (t) => `https://ecourier.com.bd/tracking?tracking_id=${encodeURIComponent(t)}`,
    hotline: "09617-227777",
    prefix: "ECR",
  },
};

/** The 5 primary couriers the storefront actively offers. */
export const PRIMARY_COURIERS: CourierId[] = [
  "Pathao",
  "RedX",
  "Steadfast",
  "Paperfly",
  "Sundarban",
];

/** Calculate delivery charge for a courier given weight & zone. */
export function calcDeliveryCharge(
  courier: CourierId,
  zone: DeliveryZone,
  weightKg: number,
): number {
  const c = COURIERS[courier];
  const base = c.baseCharge[zone];
  const extra = Math.max(0, Math.ceil(weightKg - 1)) * c.perKg;
  return base + extra;
}

export function getCourier(id: CourierId): CourierConfig {
  return COURIERS[id];
}

export const ZONE_LABEL: Record<DeliveryZone, string> = {
  inside_dhaka: "Inside Dhaka",
  sub_dhaka: "Dhaka Sub-area",
  outside_dhaka: "Outside Dhaka",
};
