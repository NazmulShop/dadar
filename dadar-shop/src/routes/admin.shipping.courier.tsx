import { createFileRoute } from "@tanstack/react-router";
import { Truck, CheckCircle2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { COURIERS } from "@/data/couriers";

export const Route = createFileRoute("/admin/shipping/courier")({ component: CourierIntegrationPage });

function CourierIntegrationPage() {
  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><Truck className="size-7" /> Courier Integration</h1>
        <p className="text-muted-foreground mt-1 text-sm">Active courier partners for order delivery.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COURIERS.map(c => (
          <div key={c.id} className="surface-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{c.name}</div>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                {c.active && <CheckCircle2 className="size-3" />}{c.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {c.trackingUrl && <div>Tracking: <a href={c.trackingUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Portal</a></div>}
              {c.apiEnabled && <div className="text-emerald-700">✓ API tracking enabled</div>}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
