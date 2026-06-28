import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  MapPin,
  Package,
  Printer,
  Receipt,
  ShieldCheck,
  Smartphone,
  Truck,
  User,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StickyHeader } from "@/components/shop/StickyHeader";
import { useAuth } from "@/lib/authStore";
import { accountFetch } from "@/lib/accountApi";
import { notify } from "@/lib/notifyStore";
import { useEffect } from "react";
import {
  SHIPPING_OPTIONS,
  useCartLines,
  useCartTotals,
  useShopActions,
} from "@/lib/shopStore";
import {
  PAYMENT_METHODS as PAYMENT_METHOD_META,
  usePaymentActions,
  type PaymentMethodId,
} from "@/lib/paymentStore";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Dadar Shop" },
      {
        name: "description",
        content:
          "Secure mobile-first checkout. Choose guest or customer checkout, pick shipping and payment, and review your order before placing it.",
      },
    ],
  }),
  component: CheckoutPage,
});

/* ------------------------------- Data ----------------------------------- */

const DISTRICTS = [
  "Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet", "Barishal", "Rangpur",
  "Mymensingh", "Cumilla", "Narayanganj", "Gazipur", "Tangail", "Jashore",
  "Bogura", "Cox's Bazar", "Pabna", "Faridpur", "Dinajpur", "Kushtia",
  "Noakhali", "Feni", "Brahmanbaria", "Habiganj", "Moulvibazar", "Sirajganj",
  "Jamalpur", "Sherpur", "Netrokona", "Kishoreganj", "Manikganj", "Munshiganj",
  "Narsingdi", "Rajbari", "Madaripur", "Shariatpur", "Gopalganj", "Magura",
  "Narail", "Chuadanga", "Meherpur", "Jhenaidah", "Satkhira", "Bagerhat",
  "Pirojpur", "Bhola", "Patuakhali", "Barguna", "Jhalokati", "Lakshmipur",
  "Chandpur", "Khagrachhari", "Rangamati", "Bandarban", "Nilphamari",
  "Lalmonirhat", "Kurigram", "Gaibandha", "Thakurgaon", "Panchagarh",
  "Joypurhat", "Naogaon", "Chapainawabganj", "Natore", "Sunamganj",
];

const PAYMENT_METHODS = PAYMENT_METHOD_META.map((m) => ({
  id: m.id,
  label: m.label,
  note: m.note,
  number: m.number,
  comingSoon: !!m.comingSoon,
  color: m.color,
  icon: m.id === "cod" ? Wallet : m.id === "visa" ? CreditCard : Smartphone,
}));

type PaymentId = PaymentMethodId;

/**
 * Stored phone numbers may be in international form (+8801XXXXXXXXX or
 * 8801XXXXXXXXX). The checkout phone field and its validator both expect
 * the local 11-digit form (01XXXXXXXXX) — simply stripping the "880"
 * prefix drops the leading 0 and produces a 10-digit string the validator
 * rejects, forcing the user to retype their own number. Restore the 0.
 */
function toLocalBdPhone(raw: string | undefined | null): string {
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("880") && digits.length >= 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("0")) return digits;
  return digits;
}

/**
 * The backend's `paymentMethod` column only supports a fixed enum
 * (bKash, Nagad, Rocket, Card, COD). Map every storefront payment id onto
 * the closest backend value so checkout never sends a value the DB schema
 * doesn't accept.
 */
function toBackendPaymentMethod(id: PaymentId): "bKash" | "Nagad" | "Rocket" | "Card" | "COD" {
  switch (id) {
    case "cod":
      return "COD";
    case "bkash":
      return "bKash";
    case "nagad":
      return "Nagad";
    case "rocket":
      return "Rocket";
    default:
      return "Card";
  }
}

interface Address {
  fullName: string;
  phone: string;
  email: string;
  district: string;
  area: string;
  address: string;
  postcode: string;
}

const emptyAddress: Address = {
  fullName: "",
  phone: "",
  email: "",
  district: "",
  area: "",
  address: "",
  postcode: "",
};

interface PlacedOrder {
  id: string;
  placedAt: string;
  mode: "guest" | "customer";
  address: Address;
  shippingLabel: string;
  shippingCost: number;
  paymentLabel: string;
  note: string;
  lines: { id: string; name: string; qty: number; price: number; image: string }[];
  subtotal: number;
  discount: number;
  total: number;
  couponCode: string | null;
}

/* ----------------------------- Component -------------------------------- */

function CheckoutPage() {
  const navigate = useNavigate();
  const lines = useCartLines();
  const totals = useCartTotals();
  const { setShipping, clearCart } = useShopActions();
  const { createTransaction } = usePaymentActions();
  const { isAuthenticated, user, getToken } = useAuth();

  // Auth guard — only signed-in users can check out
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({
        to: "/auth/login",
        search: { redirect: "/checkout" } as never,
      });
    }
  }, [isAuthenticated, navigate]);

  // Customer-only checkout (guest mode removed by product decision)
  const mode = "customer" as const;
  const [address, setAddress] = useState<Address>({
    ...emptyAddress,
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    phone: toLocalBdPhone(user?.phone),
  });
  const [payment, setPayment] = useState<PaymentId>("cod");
  const [trxRef, setTrxRef] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const [busy, setBusy] = useState(false);

  const empty = lines.length === 0 && !placed;
  const selectedMethod = PAYMENT_METHODS.find((p) => p.id === payment) ?? PAYMENT_METHODS[0]!;
  const isWallet = ["bkash", "nagad", "rocket", "upay"].includes(payment);



  function validate(): boolean {
    const e: Partial<Record<keyof Address, string>> = {};
    if (!address.fullName.trim()) e.fullName = "Required";
    if (!address.phone.trim()) e.phone = "Required";
    if (mode === "customer" && !/^\S+@\S+\.\S+$/.test(address.email.trim()))
      e.email = "Enter a valid email";
    if (!address.district) e.district = "Pick a district";
    if (!address.address.trim() || address.address.trim().length < 8)
      e.address = "Add a complete delivery address";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function placeOrder() {
    if (selectedMethod.comingSoon) return;
    if (busy) return;
    if (!validate()) {
      const first = document.querySelector("[data-error='true']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setBusy(true);
    try {
      const data = await accountFetch<{ order: { id: string; status: string; total: number } }>(
        "/orders",
        getToken(),
        {
          method: "POST",
          body: JSON.stringify({
            items: lines.map(({ line, product }) => ({
              productId: product.id,
              name: product.name,
              qty: line.qty,
              price: product.price,
            })),
            shipTo: {
              name: address.fullName,
              phone: address.phone,
              line1: address.address,
              area: address.area || address.district,
              city: address.district,
            },
            paymentMethod: toBackendPaymentMethod(payment),
            deliveryCharge: totals.shipping,
          }),
        },
      );

      const orderId = data.order.id;
      const order: PlacedOrder = {
        id: orderId,
        placedAt: new Date().toISOString(),
        mode,
        address,
        shippingLabel: totals.shippingOption.label,
        shippingCost: totals.shipping,
        paymentLabel: selectedMethod.label,
        note: note.trim(),
        lines: lines.map(({ line, product }) => ({
          id: product.id,
          name: product.name,
          qty: line.qty,
          price: product.price,
          image: product.image as string,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        couponCode: totals.coupon?.code ?? null,
      };

      createTransaction({
        orderId,
        method: payment,
        amount: totals.total,
        customerName: address.fullName,
        customerPhone: address.phone,
        trxRef: isWallet && trxRef.trim() ? trxRef.trim() : undefined,
        note: note.trim() || undefined,
      });
      setPlaced(order);
      clearCart();

      // Fire notifications across user-enabled channels
      notify({
        event: "new_order",
        to: { name: address.fullName, email: address.email, phone: address.phone },
        data: { orderId, total: totals.total },
      });
      // For COD assume payment pending; for wallets/cards we mock-success here.
      if (payment !== "cod") {
        notify({
          event: "payment_success",
          to: { name: address.fullName, email: address.email, phone: address.phone },
          data: {
            orderId,
            total: totals.total,
            method: selectedMethod.label,
            trxId: trxRef.trim() || `TRX${Date.now().toString(36).toUpperCase()}`,
          },
        });
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't place your order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (placed) return <InvoiceView order={placed} onHome={() => navigate({ to: "/" })} />;

  if (empty) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <StickyHeader />
        <div className="mx-auto w-full max-w-[720px] px-4 pt-6">
          <EmptyCheckout />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <StickyHeader />
      <div className="mx-auto w-full max-w-[720px] px-4 pt-2">
        <button
          onClick={() => navigate({ to: "/cart" })}
          className="tap-scale tap-scale-active mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Back to cart
        </button>

        <header className="mb-4">
          <h1 className="text-display text-2xl font-semibold">Checkout</h1>
          <p className="text-xs text-muted-foreground">
            {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"} · ৳
            {totals.total.toLocaleString()}
          </p>
        </header>

        <ProgressDots step={1} />

        {/* 1. Signed-in customer */}
        <Section icon={<User className="size-4" />} title={`1. Signed in as ${user?.name ?? ""}`}>
          <div className="bg-primary-soft text-primary-foreground/90 flex items-center gap-2 rounded-2xl p-3 text-[12px]">
            <Check className="size-4" />
            <span>
              {user?.email} — your order will be saved to your Dadar Shop account.
            </span>
          </div>
        </Section>

        {/* 2. Address */}
        <Section icon={<MapPin className="size-4" />} title="2. Shipping address">
          <div className="grid grid-cols-1 gap-3">
            <Field
              label="Full name"
              value={address.fullName}
              onChange={(v) => setAddress({ ...address, fullName: v })}
              error={errors.fullName}
              placeholder="e.g. Rahim Uddin"
              autoComplete="name"
            />
            <Field
              label="Phone"
              value={address.phone}
              onChange={(v) => setAddress({ ...address, phone: v })}
              error={errors.phone}
              placeholder="Phone number"
              inputMode="tel"
              autoComplete="tel"
            />
            {mode === "customer" && (
              <Field
                label="Email"
                value={address.email}
                onChange={(v) => setAddress({ ...address, email: v })}
                error={errors.email}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            )}
            <SelectField
              label="District"
              value={address.district}
              onChange={(v) => setAddress({ ...address, district: v })}
              options={DISTRICTS}
              error={errors.district}
              placeholder="Select district"
            />
            <Field
              label="Area / Thana"
              value={address.area}
              onChange={(v) => setAddress({ ...address, area: v })}
              placeholder="e.g. Mirpur, Dhanmondi"
              autoComplete="address-level2"
            />
            <Field
              label="Address line"
              value={address.address}
              onChange={(v) => setAddress({ ...address, address: v })}
              error={errors.address}
              placeholder="House #, Road #, landmark"
              autoComplete="street-address"
              textarea
            />
            <Field
              label="Postcode (optional)"
              value={address.postcode}
              onChange={(v) =>
                setAddress({ ...address, postcode: v.replace(/\D/g, "").slice(0, 6) })
              }
              placeholder="1207"
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </div>
        </Section>

        {/* 3. Shipping */}
        <Section icon={<Truck className="size-4" />} title="3. Shipping method">
          <div className="space-y-2">
            {SHIPPING_OPTIONS.map((opt) => {
              const active = totals.shippingOption.id === opt.id;
              const free = totals.shippingFreeApplied && opt.id === "standard";
              return (
                <button
                  key={opt.id}
                  onClick={() => setShipping(opt.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border bg-surface p-3 text-left transition-colors",
                    active ? "border-primary ring-2 ring-primary/20" : "border-border",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioDot active={active} />
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-[11px] text-muted-foreground">{opt.eta}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {free ? "Free" : opt.cost === 0 ? "Free" : `৳${opt.cost}`}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* 4. Payment */}
        <Section icon={<CreditCard className="size-4" />} title="4. Payment method">
          <div className="space-y-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const active = payment === m.id;
              const disabled = m.comingSoon;
              return (
                <button
                  key={m.id}
                  onClick={() => !disabled && setPayment(m.id)}
                  disabled={disabled}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left transition-colors",
                    active ? "border-primary ring-2 ring-primary/20" : "border-border",
                    disabled && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <RadioDot active={active} />
                  <span
                    className="flex size-9 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {m.label}
                      {disabled && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{m.note}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {isWallet && (
            <div className="mt-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
              <div className="font-semibold text-foreground">
                {selectedMethod.label} payment instructions
              </div>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-muted-foreground">
                <li>Send <b>৳{totals.total.toLocaleString()}</b> to <b>{selectedMethod.number}</b></li>
                <li>Copy the Transaction ID from your SMS</li>
                <li>Paste it below and place your order</li>
              </ol>
              <input
                value={trxRef}
                onChange={(e) => setTrxRef(e.target.value.toUpperCase().slice(0, 20))}
                placeholder="e.g. 9F4KQXA12B"
                className="mt-2 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus-visible:border-primary"
              />
            </div>
          )}

          {selectedMethod.comingSoon && (
            <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Visa / Mastercard payments are <b>Coming soon</b>. Please pick another option to continue.
            </p>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 240))}
            placeholder="Order note (optional)"
            className="mt-3 min-h-[64px] w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus-visible:border-primary"
          />
        </Section>

        {/* 5. Order summary */}
        <Section icon={<Package className="size-4" />} title="5. Order summary">
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {lines.map(({ line, product }) => (
              <li key={line.id} className="flex items-center gap-3 p-3">
                <img
                  src={product.image as string}
                  alt={product.name}
                  className="size-14 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{product.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {product.brand} · Qty {line.qty}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  ৳{(product.price * line.qty).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 text-sm">
            <SummaryRow label="Subtotal" value={`৳${totals.subtotal.toLocaleString()}`} />
            <SummaryRow
              label={`Shipping (${totals.shippingOption.label})`}
              value={totals.shipping === 0 ? "Free" : `৳${totals.shipping}`}
            />
            {totals.discount > 0 && (
              <SummaryRow
                label={`Discount${totals.coupon ? ` · ${totals.coupon.code}` : ""}`}
                value={`−৳${totals.discount.toLocaleString()}`}
                tone="success"
              />
            )}
            <div className="mt-2 flex items-end justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total payable</span>
              <span className="text-display text-2xl font-semibold tabular-nums">
                ৳{totals.total.toLocaleString()}
              </span>
            </div>
          </dl>
        </Section>

        <Button
          variant="hero"
          size="xl"
          className="mt-6 w-full"
          onClick={placeOrder}
          disabled={selectedMethod.comingSoon || busy}
        >
          {selectedMethod.comingSoon
            ? "Visa — Coming soon"
            : busy
              ? "Placing order…"
              : `Place order · ৳${totals.total.toLocaleString()}`}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Secure checkout · Buyer protection on every order
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Sub-views -------------------------------- */

function EmptyCheckout() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
      <Package className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 className="text-display text-lg font-semibold">Your cart is empty</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add a few products before heading to checkout.
      </p>
      <Button asChild variant="hero" size="default" className="mt-5">
        <Link to="/shop">Continue shopping</Link>
      </Button>
    </div>
  );
}

function InvoiceView({ order, onHome }: { order: PlacedOrder; onHome: () => void }) {
  return (
    <div className="min-h-screen bg-background pb-24 print:bg-white">
      <StickyHeader />
      <div className="mx-auto w-full max-w-[720px] px-4 pt-6 print:pt-0">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="bg-primary/15 text-primary mb-3 inline-flex size-14 items-center justify-center rounded-full">
            <Check className="size-7" strokeWidth={2.5} />
          </span>
          <h1 className="text-display text-2xl font-semibold">Order placed!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Thanks {order.address.fullName.split(" ")[0] || "there"} — we'll text you on{" "}
            {order.address.phone} when it ships.
          </p>
        </div>

        <article className="rounded-3xl border border-border bg-surface p-5 shadow-soft print:border print:shadow-none">
          <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="text-display text-lg font-semibold">Dadar Shop</div>
              <div className="text-[11px] text-muted-foreground">Invoice</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Order ID</div>
              <div className="text-sm font-semibold tabular-nums">{order.id}</div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(order.placedAt).toLocaleString()}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 border-b border-border py-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ship to
              </div>
              <div className="mt-1 text-sm font-medium">{order.address.fullName}</div>
              <div className="text-xs text-muted-foreground">{order.address.phone}</div>
              {order.address.email && (
                <div className="text-xs text-muted-foreground">{order.address.email}</div>
              )}
              <div className="mt-1 text-xs leading-relaxed text-foreground">
                {order.address.address}
                {order.address.area ? `, ${order.address.area}` : ""}
                <br />
                {order.address.district}
                {order.address.postcode ? ` — ${order.address.postcode}` : ""}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Delivery & payment
              </div>
              <div className="mt-1 text-sm">
                <span className="font-medium">Shipping:</span> {order.shippingLabel}{" "}
                <span className="text-muted-foreground">
                  ({order.shippingCost === 0 ? "Free" : `৳${order.shippingCost}`})
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Payment:</span> {order.paymentLabel}
              </div>
              <div className="text-sm">
                <span className="font-medium">Mode:</span>{" "}
                {order.mode === "guest" ? "Guest checkout" : "Customer"}
              </div>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 text-left font-semibold">Item</th>
                <th className="py-2 text-center font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Price</th>
                <th className="py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={l.image}
                        alt={l.name}
                        className="size-10 shrink-0 rounded-lg object-cover print:hidden"
                      />
                      <span className="text-sm">{l.name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center tabular-nums">{l.qty}</td>
                  <td className="py-2 text-right tabular-nums">৳{l.price.toLocaleString()}</td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    ৳{(l.price * l.qty).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <SummaryRow label="Subtotal" value={`৳${order.subtotal.toLocaleString()}`} />
            <SummaryRow
              label={`Shipping (${order.shippingLabel})`}
              value={order.shippingCost === 0 ? "Free" : `৳${order.shippingCost}`}
            />
            {order.discount > 0 && (
              <SummaryRow
                label={`Discount${order.couponCode ? ` · ${order.couponCode}` : ""}`}
                value={`−৳${order.discount.toLocaleString()}`}
                tone="success"
              />
            )}
            <div className="mt-2 flex items-end justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Grand total</span>
              <span className="text-display text-2xl font-semibold tabular-nums">
                ৳{order.total.toLocaleString()}
              </span>
            </div>
          </dl>

          {order.note && (
            <p className="mt-4 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Note: </span>
              {order.note}
            </p>
          )}
        </article>

        <div className="mt-5 grid grid-cols-2 gap-2 print:hidden">
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Print
          </Button>
          <Button variant="hero" size="lg" onClick={onHome}>
            <Receipt className="mr-2 size-4" /> Done
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Primitives ------------------------------- */

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card mt-4 rounded-3xl p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ModeChip({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tap-scale tap-scale-active rounded-2xl border bg-surface p-3 text-left transition-colors",
        active ? "border-primary ring-2 ring-primary/20" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <RadioDot active={active} />
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </button>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 items-center justify-center rounded-full border-2",
        active ? "border-primary bg-primary" : "border-border bg-surface",
      )}
    >
      {active && <Check className="text-primary-foreground size-3" strokeWidth={3} />}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  textarea?: boolean;
}) {
  const cls = cn(
    "w-full rounded-2xl border bg-surface px-4 py-3 text-sm outline-none transition-colors",
    error
      ? "border-destructive focus-visible:border-destructive"
      : "border-border focus-visible:border-primary",
  );
  return (
    <label className="block" data-error={error ? "true" : undefined}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(cls, "min-h-[72px] resize-none")}
        />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(cls, "h-11")}
        />
      )}
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="block" data-error={error ? "true" : undefined}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-11 w-full appearance-none rounded-2xl border bg-surface px-4 pr-9 text-sm outline-none transition-colors",
            error
              ? "border-destructive focus-visible:border-destructive"
              : "border-border focus-visible:border-primary",
            !value && "text-muted-foreground",
          )}
        >
          <option value="" disabled>
            {placeholder ?? "Select"}
          </option>
          {options.map((o) => (
            <option key={o} value={o} className="text-foreground">
              {o}
            </option>
          ))}
        </select>
        <ChevronRight className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 rotate-90 text-muted-foreground" />
      </div>
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums font-medium",
          tone === "success" ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProgressDots({ step }: { step: number }) {
  const labels = ["Details", "Shipping", "Payment", "Review"];
  return (
    <ol className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {labels.map((l, i) => {
        const active = i + 1 <= step;
        return (
          <li key={l} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                active ? "bg-primary" : "bg-border",
              )}
            />
            <span className={cn(active && "text-foreground font-medium")}>{l}</span>
            {i < labels.length - 1 && <span className="mx-1 text-border">·</span>}
          </li>
        );
      })}
    </ol>
  );
}
