import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/payment-methods")({
  component: PaymentMethodsPage,
});

const PAYMENT_METHODS = [
  { id: "bKash", name: "bKash", color: "#E2136E", type: "Mobile Banking", desc: "Bangladesh's most popular MFS" },
  { id: "Nagad", name: "Nagad", color: "#EB6E1F", type: "Mobile Banking", desc: "Bangladesh Post Office MFS" },
  { id: "Rocket", name: "Rocket", color: "#8C2D8D", type: "Mobile Banking", desc: "Dutch-Bangla Bank MFS" },
  { id: "Card", name: "Card (Visa/MC)", color: "#1A1F71", type: "Credit/Debit Card", desc: "International card payments" },
  { id: "COD", name: "Cash on Delivery", color: "#0F766E", type: "Offline", desc: "Pay when delivered" },
];

function usePaymentStats() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    adminFetch("orders")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setOrders(d); }).catch(() => {});
  }, []);
  return orders;
}

function PaymentMethodsPage() {
  const orders = usePaymentStats();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    bKash: true, Nagad: true, Rocket: true, Card: true, COD: true
  });

  const stats = PAYMENT_METHODS.map(pm => {
    const pmOrders = orders.filter(o => o.paymentMethod === pm.id);
    return {
      ...pm,
      count: pmOrders.length,
      volume: pmOrders.reduce((s, o) => s + (o.total ?? 0), 0),
    };
  });

  const totalVolume = orders.reduce((s, o) => s + (o.total ?? 0), 0) || 1;

  function toggle(id: string) {
    setEnabled(e => ({ ...e, [id]: !e[id] }));
    toast.success(`${id} ${!enabled[id] ? "enabled" : "disabled"}`);
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
          <CreditCard className="size-7" /> Payment Methods
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage enabled payment gateways and view live transaction breakdown.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {stats.map(pm => (
          <div key={pm.id} className="surface-card rounded-3xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="size-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: pm.color }}>{pm.id.slice(0, 2)}</span>
                <div>
                  <div className="font-semibold text-sm">{pm.name}</div>
                  <div className="text-muted-foreground text-xs">{pm.type} · {pm.desc}</div>
                </div>
              </div>
              <button onClick={() => toggle(pm.id)} className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                enabled[pm.id] ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              )}>
                {enabled[pm.id] ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                {enabled[pm.id] ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-surface-muted rounded-2xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Orders</div>
                <div className="text-lg font-semibold mt-1">{pm.count}</div>
              </div>
              <div className="bg-surface-muted rounded-2xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume</div>
                <div className="text-lg font-semibold mt-1">{formatBDT(pm.volume)}</div>
              </div>
              <div className="bg-surface-muted rounded-2xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Share</div>
                <div className="text-lg font-semibold mt-1">{((pm.volume / totalVolume) * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div className="mt-3 h-2 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(pm.volume / totalVolume) * 100}%`, background: pm.color }} />
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
