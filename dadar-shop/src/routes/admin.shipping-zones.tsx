import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping-zones")({
  component: ShippingZonesPage,
});

const INITIAL_ZONES = [
  { id: "inside_dhaka", name: "Inside Dhaka", areas: "Dhaka City Corporation", charge: 60, estimatedDays: "1-2", active: true },
  { id: "sub_dhaka", name: "Sub-Dhaka / Nearby", areas: "Gazipur, Narayanganj, Savar, Manikganj", charge: 80, estimatedDays: "2-3", active: true },
  { id: "outside_dhaka", name: "Outside Dhaka", areas: "All other districts", charge: 120, estimatedDays: "3-5", active: true },
  { id: "outside_bd", name: "Outside Bangladesh", areas: "International shipping", charge: 1200, estimatedDays: "7-14", active: false },
];

function ShippingZonesPage() {
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCharge, setEditCharge] = useState("");

  function startEdit(id: string, charge: number) {
    setEditing(id);
    setEditCharge(charge.toString());
  }

  function saveEdit(id: string) {
    const charge = parseInt(editCharge);
    if (isNaN(charge) || charge < 0) { toast.error("Invalid charge"); return; }
    setZones(z => z.map(zone => zone.id === id ? { ...zone, charge } : zone));
    setEditing(null);
    toast.success("Shipping charge updated");
  }

  function toggleActive(id: string) {
    setZones(z => z.map(zone => zone.id === id ? { ...zone, active: !zone.active } : zone));
    toast.success("Zone updated");
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
              <MapPin className="size-7" /> Shipping Zones
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Configure delivery zones and charges for Bangladesh.</p>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        {zones.map(zone => (
          <div key={zone.id} className={cn("surface-card rounded-3xl p-5", !zone.active && "opacity-60")}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{zone.name}</h3>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    zone.active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                    {zone.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs mt-1">{zone.areas}</p>
                <p className="text-muted-foreground text-xs">Estimated delivery: {zone.estimatedDays} days</p>
              </div>
              <div className="flex items-center gap-2">
                {editing === zone.id ? (
                  <div className="flex items-center gap-2">
                    <Input value={editCharge} onChange={e => setEditCharge(e.target.value)}
                      className="w-24 h-8" placeholder="৳" />
                    <Button size="sm" onClick={() => saveEdit(zone.id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <div className="text-right">
                      <div className="font-semibold text-primary">{formatBDT(zone.charge)}</div>
                      <div className="text-muted-foreground text-[10px]">delivery charge</div>
                    </div>
                    <button onClick={() => startEdit(zone.id, zone.charge)}
                      className="p-2 rounded-xl hover:bg-surface-muted text-muted-foreground hover:text-foreground">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => toggleActive(zone.id)}
                      className="p-2 rounded-xl hover:bg-surface-muted text-muted-foreground hover:text-foreground">
                      {zone.active ? <Trash2 className="size-4 text-rose-500" /> : <Plus className="size-4 text-emerald-600" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 surface-card rounded-3xl p-5">
        <h3 className="font-semibold text-sm mb-3">Zone Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {zones.filter(z => z.active).map(z => (
            <div key={z.id} className="bg-surface-muted rounded-2xl p-3 text-center">
              <div className="font-semibold text-sm">{z.name}</div>
              <div className="text-primary font-bold mt-1">{formatBDT(z.charge)}</div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
