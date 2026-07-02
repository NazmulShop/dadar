import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Plus, Pencil, Trash2, X } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/data/account";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping-zones")({
  component: ShippingZonesPage,
});

interface Zone {
  id: string;
  name: string;
  areas: string;
  charge: number;
  estimatedDays: string;
  active: boolean;
  sortOrder: number;
}

const EMPTY_FORM = { name: "", areas: "", charge: "", estimatedDays: "", active: true };

function ShippingZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCharge, setEditCharge] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function load() {
    adminFetch<Zone[]>("shipping-zones")
      .then(d => { if (Array.isArray(d)) setZones(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function startEdit(id: string, charge: number) {
    setEditing(id);
    setEditCharge(charge.toString());
  }

  async function saveEdit(id: string) {
    const charge = parseInt(editCharge, 10);
    if (isNaN(charge) || charge < 0) { toast.error("Invalid charge"); return; }
    const prev = zones;
    setZones(z => z.map(zone => zone.id === id ? { ...zone, charge } : zone));
    setEditing(null);
    try {
      await adminPut(`shipping-zones/${id}`, { charge });
      toast.success("Shipping charge updated");
    } catch {
      setZones(prev);
      toast.error("Failed to update charge");
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const prev = zones;
    setZones(z => z.map(zone => zone.id === id ? { ...zone, active: !active } : zone));
    try {
      await adminPut(`shipping-zones/${id}`, { active: !active });
      toast.success("Zone updated");
    } catch {
      setZones(prev);
      toast.error("Failed to update zone");
    }
  }

  async function deleteZone(id: string) {
    if (!confirm("Delete this shipping zone?")) return;
    const prev = zones;
    setZones(z => z.filter(zone => zone.id !== id));
    try {
      await adminDelete(`shipping-zones/${id}`);
      toast.success("Zone deleted");
    } catch {
      setZones(prev);
      toast.error("Failed to delete zone");
    }
  }

  async function createZone() {
    if (!form.name.trim()) { toast.error("Zone name required"); return; }
    const charge = parseInt(form.charge, 10);
    if (isNaN(charge) || charge < 0) { toast.error("Valid delivery charge required"); return; }
    setSaving(true);
    try {
      const created = await adminPost<Zone>("shipping-zones", {
        name: form.name.trim(),
        areas: form.areas.trim(),
        charge,
        estimatedDays: form.estimatedDays.trim(),
        active: form.active,
        sortOrder: zones.length,
      });
      setZones(z => [...z, created]);
      toast.success("Shipping zone created");
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch {
      toast.error("Failed to create zone");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display flex items-center gap-2 text-3xl font-semibold">
              <MapPin className="size-7" /> Shipping Zones
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Configure delivery zones and charges for Bangladesh.</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowForm(s => !s)}>
            {showForm ? <X className="size-4 mr-1" /> : <Plus className="size-4 mr-1" />}
            {showForm ? "Cancel" : "Add Zone"}
          </Button>
        </div>
      </header>

      {showForm && (
        <div className="surface-card mb-4 rounded-3xl p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Zone name</Label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chattogram Metro" /></div>
            <div><Label>Delivery charge (৳)</Label><Input className="mt-1" type="number" value={form.charge} onChange={e => setForm(f => ({ ...f, charge: e.target.value }))} placeholder="100" /></div>
            <div><Label>Areas covered</Label><Input className="mt-1" value={form.areas} onChange={e => setForm(f => ({ ...f, areas: e.target.value }))} placeholder="e.g. Agrabad, Halishahar" /></div>
            <div><Label>Estimated days</Label><Input className="mt-1" value={form.estimatedDays} onChange={e => setForm(f => ({ ...f, estimatedDays: e.target.value }))} placeholder="e.g. 3-4" /></div>
          </div>
          <Button variant="hero" size="sm" onClick={createZone} disabled={saving}>{saving ? "Saving…" : "Create Zone"}</Button>
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-muted-foreground text-sm text-center py-8">Loading…</p>}
        {!loading && zones.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">No shipping zones yet.</p>
        )}
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
                    <button onClick={() => toggleActive(zone.id, zone.active)}
                      className="p-2 rounded-xl hover:bg-surface-muted text-muted-foreground hover:text-foreground"
                      title={zone.active ? "Deactivate" : "Activate"}>
                      {zone.active ? <Trash2 className="size-4 text-rose-500" /> : <Plus className="size-4 text-emerald-600" />}
                    </button>
                    <button onClick={() => deleteZone(zone.id)}
                      className="p-2 rounded-xl hover:bg-surface-muted text-muted-foreground hover:text-rose-600" title="Delete">
                      <X className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {zones.some(z => z.active) && (
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
      )}
    </AdminLayout>
  );
}
