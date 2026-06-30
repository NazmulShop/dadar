import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { adminFetch, adminPut, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping-zones")({
  component: ShippingZonesPage,
});

interface ShippingZone {
  id: string;
  name: string;
  areas: string;
  charge: number;
  estimatedDays: string;
  active: boolean;
}

function ShippingZonesPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCharge, setEditCharge] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<ShippingZone[]>("shipping-zones")
      .then(d => { if (Array.isArray(d)) setZones(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function startEdit(id: string, charge: number) {
    setEditing(id);
    setEditCharge(charge.toString());
  }

  async function saveEdit(id: string) {
    const charge = parseInt(editCharge);
    if (isNaN(charge) || charge < 0) { toast.error("Invalid charge"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/shipping-zones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ charge }),
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (data.zones) setZones(data.zones);
        else setZones(z => z.map(zone => zone.id === id ? { ...zone, charge } : zone));
        setEditing(null);
        toast.success("Shipping charge updated");
      } else {
        toast.error("Update failed");
      }
    } catch { toast.error("Network error"); }
    setSaving(false);
  }

  async function toggleActive(id: string) {
    const zone = zones.find(z => z.id === id);
    if (!zone) return;
    const newActive = !zone.active;
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/shipping-zones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ active: newActive }),
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (data.zones) setZones(data.zones);
        else setZones(z => z.map(zone => zone.id === id ? { ...zone, active: newActive } : zone));
        toast.success(newActive ? "Zone activated" : "Zone deactivated");
      } else {
        toast.error("Update failed");
      }
    } catch { toast.error("Network error"); }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
          <MapPin className="size-7" /> Shipping Zones
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure delivery zones and charges for Bangladesh.</p>
      </header>

      {loading ? (
        <div className="surface-card rounded-3xl p-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : (
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
                      <Input
                        value={editCharge}
                        onChange={e => setEditCharge(e.target.value)}
                        className="w-24 h-8"
                        placeholder="৳"
                        disabled={saving}
                      />
                      <Button size="sm" onClick={() => saveEdit(zone.id)} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-right">
                        <div className="font-semibold text-primary">{formatBDT(zone.charge)}</div>
                        <div className="text-muted-foreground text-[10px]">delivery charge</div>
                      </div>
                      <button
                        onClick={() => startEdit(zone.id, zone.charge)}
                        className="p-2 rounded-xl hover:bg-surface-muted text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(zone.id)}
                        className="p-2 rounded-xl hover:bg-surface-muted text-muted-foreground hover:text-foreground"
                      >
                        {zone.active
                          ? <Trash2 className="size-4 text-rose-500" />
                          : <Plus className="size-4 text-emerald-600" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && zones.length > 0 && (
        <div className="mt-4 surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-3">Active Zones Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {zones.filter(z => z.active).map(z => (
              <div key={z.id} className="bg-surface-muted rounded-2xl p-3 text-center">
                <div className="font-semibold text-sm">{z.name}</div>
                <div className="text-primary font-bold mt-1">{formatBDT(z.charge)}</div>
                <div className="text-muted-foreground text-[10px] mt-0.5">{z.estimatedDays} days</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
