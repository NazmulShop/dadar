/**
 * account.ts — Shared types, formatters, and static UI labels.
 * All runtime user data (orders, refunds, reviews, addresses, etc.)
 * is fetched from the API. No mock data lives here.
 */
import type { CourierId, DeliveryZone } from "./couriers";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatarInitials: string;
  memberSince: string;
  tier: "Silver" | "Gold" | "Platinum";
}

export type OrderStatus =
  | "Placed"
  | "Processing"
  | "Packed"
  | "Shipped"
  | "Out for delivery"
  | "Delivered"
  | "Cancelled"
  | "Returned";

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
}

export interface TimelineEvent {
  status: OrderStatus | string;
  note?: string;
  at: string; // ISO
  location?: string;
  done: boolean;
}

export interface Order {
  id: string; // DS-XXXX
  placedAt: string;
  status: OrderStatus;
  total: number;
  paymentMethod: "bKash" | "Nagad" | "Rocket" | "Card" | "COD";
  courier: CourierId;
  trackingNumber?: string;
  estimatedDelivery: string;
  shipTo: { name: string; line1: string; area: string; city: string; phone: string };
  items: OrderItem[];
  timeline: TimelineEvent[];
  weightKg?: number;
  deliveryCharge?: number;
  deliveryZone?: DeliveryZone;
  deliveryAgent?: { name: string; phone: string; vehicle?: string; rating?: number };
}

export interface SavedAddress {
  id: string;
  label: string; // Home / Office
  name: string;
  phone: string;
  line1: string;
  area: string;
  city: string;
  isDefault: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  kind: "order" | "promo" | "system" | "payment" | "refund";
  event?: NotificationEvent;
  channels?: NotificationChannel[];
  unread: boolean;
}

export type NotificationEvent =
  | "new_order"
  | "payment_success"
  | "payment_failed"
  | "order_shipped"
  | "order_delivered"
  | "refund_approved"
  | "coupon_available";

export type NotificationChannel = "in_app" | "email" | "sms" | "push";

export const NOTIFICATION_EVENT_LABEL: Record<NotificationEvent, string> = {
  new_order: "New Order",
  payment_success: "Payment Success",
  payment_failed: "Payment Failed",
  order_shipped: "Order Shipped",
  order_delivered: "Order Delivered",
  refund_approved: "Refund Approved",
  coupon_available: "Coupon Available",
};

export const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  in_app: "In-App",
  email: "Email",
  sms: "SMS",
  push: "Push",
};

export interface NotificationTemplate {
  event: NotificationEvent;
  subject: string;
  inApp: string;
  email: string;
  sms: string;
  push: string;
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    event: "new_order",
    subject: "Order {{orderId}} placed",
    inApp: "Your order {{orderId}} is confirmed. We'll notify you on shipping.",
    email: "Hi {{name}}, thanks for shopping at Dadar Shop! Order {{orderId}} for ৳{{total}} has been received.",
    sms: "Dadar Shop: Order {{orderId}} placed (৳{{total}}). Track in the app.",
    push: "Order {{orderId}} placed · ৳{{total}}",
  },
  {
    event: "payment_success",
    subject: "Payment received for {{orderId}}",
    inApp: "Payment of ৳{{total}} via {{method}} confirmed for {{orderId}}.",
    email: "Hi {{name}}, we received ৳{{total}} via {{method}} for order {{orderId}}. TrxID {{trxId}}.",
    sms: "Dadar Shop: ৳{{total}} received via {{method}} for {{orderId}}. TrxID {{trxId}}.",
    push: "Payment success · {{orderId}}",
  },
  {
    event: "payment_failed",
    subject: "Payment failed for {{orderId}}",
    inApp: "We couldn't process your {{method}} payment for {{orderId}}. Please retry.",
    email: "Hi {{name}}, your {{method}} payment for {{orderId}} failed. You can retry from the order page.",
    sms: "Dadar Shop: Payment failed for {{orderId}}. Tap to retry.",
    push: "Payment failed · {{orderId}}",
  },
  {
    event: "order_shipped",
    subject: "Order {{orderId}} shipped via {{courier}}",
    inApp: "{{courier}} picked up {{orderId}}. Tracking: {{trackingNumber}}.",
    email: "Hi {{name}}, {{orderId}} has shipped with {{courier}} (tracking {{trackingNumber}}). ETA {{eta}}.",
    sms: "Dadar Shop: {{orderId}} shipped via {{courier}}. Track {{trackingNumber}}.",
    push: "Shipped · {{orderId}}",
  },
  {
    event: "order_delivered",
    subject: "Order {{orderId}} delivered",
    inApp: "Your order {{orderId}} was delivered. Rate it to earn 20 points.",
    email: "Hi {{name}}, {{orderId}} was delivered today. We'd love your review — earn 20 reward points.",
    sms: "Dadar Shop: {{orderId}} delivered. Rate to earn 20 points.",
    push: "Delivered · {{orderId}}",
  },
  {
    event: "refund_approved",
    subject: "Refund approved for {{refundId}}",
    inApp: "Your refund {{refundId}} (৳{{amount}}) was approved via {{method}}.",
    email: "Hi {{name}}, refund {{refundId}} of ৳{{amount}} has been approved via {{method}} by {{eta}}.",
    sms: "Dadar Shop: Refund {{refundId}} approved (৳{{amount}}) via {{method}}.",
    push: "Refund approved · {{refundId}}",
  },
  {
    event: "coupon_available",
    subject: "New coupon for you: {{code}}",
    inApp: "You unlocked a new coupon {{code}} — {{discount}} off. Valid till {{expiry}}.",
    email: "Hi {{name}}, enjoy {{discount}} off with code {{code}}. Hurry, expires {{expiry}}.",
    sms: "Dadar Shop: Use {{code}} for {{discount}} off. Expires {{expiry}}.",
    push: "Coupon {{code}} · {{discount}} off",
  },
];

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ["in_app", "email", "sms", "push"];

export const DEFAULT_NOTIFICATION_PREFS: Record<NotificationEvent, Record<NotificationChannel, boolean>> = {
  new_order:        { in_app: true,  email: true,  sms: true,  push: true  },
  payment_success:  { in_app: true,  email: true,  sms: true,  push: true  },
  payment_failed:   { in_app: true,  email: true,  sms: true,  push: true  },
  order_shipped:    { in_app: true,  email: true,  sms: false, push: true  },
  order_delivered:  { in_app: true,  email: true,  sms: false, push: true  },
  refund_approved:  { in_app: true,  email: true,  sms: true,  push: true  },
  coupon_available: { in_app: true,  email: false, sms: false, push: true  },
};

export interface Review {
  id: string;
  productId?: string;
  productName: string;
  rating: number;
  title?: string;
  comment: string;
  at: string;
  status: "Published" | "Pending" | "Rejected";
  verifiedPurchase?: boolean;
  photos?: string[];
  videos?: string[];
  likes?: number;
  reports?: number;
  authorName?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: "Order" | "Payment" | "Return" | "Account" | "Other";
  status: "Open" | "Awaiting reply" | "Resolved";
  updatedAt: string;
  lastMessage: string;
}

export interface RewardActivity {
  id: string;
  label: string;
  points: number; // +earn / -spend
  at: string;
}

// ─── Refund types ───────────────────────────────────────────────────────────

export type RefundStatus =
  | "Requested"
  | "Approved"
  | "Pickup scheduled"
  | "Picked up"
  | "In transit"
  | "Inspecting"
  | "Refund initiated"
  | "Completed"
  | "Rejected";

export type RefundReason =
  | "Wrong item delivered"
  | "Damaged on arrival"
  | "Size / fit issue"
  | "Quality not as described"
  | "Changed my mind"
  | "Late delivery"
  | "Other";

export type RefundMethod = "Original payment" | "bKash" | "Nagad" | "Bank transfer" | "Store credit";

export interface RefundTimelineEvent {
  status: RefundStatus | string;
  note?: string;
  at: string;
  done: boolean;
}

export interface Refund {
  id: string; // RF-XXXX
  orderId: string;
  productName: string;
  amount: number;
  reason: RefundReason;
  status: RefundStatus;
  method: RefundMethod;
  requestedAt: string;
  expectedBy: string;
  trackingNumber?: string;
  courier?: string;
  notes?: string;
  timeline: RefundTimelineEvent[];
}

export const REFUND_STATUS_TONE: Record<RefundStatus, string> = {
  Requested: "bg-amber-100 text-amber-800",
  Approved: "bg-blue-100 text-blue-800",
  "Pickup scheduled": "bg-blue-100 text-blue-800",
  "Picked up": "bg-indigo-100 text-indigo-800",
  "In transit": "bg-indigo-100 text-indigo-800",
  Inspecting: "bg-violet-100 text-violet-800",
  "Refund initiated": "bg-teal-100 text-teal-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-800",
};

// ─── Formatters ─────────────────────────────────────────────────────────────

export function formatBDT(n: number) {
  return `৳${n.toLocaleString("en-BD")}`;
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Dhaka",
    ...opts,
  });
}

export function formatDay(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}
