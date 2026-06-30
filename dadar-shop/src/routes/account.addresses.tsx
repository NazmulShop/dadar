import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/authStore";
import { accountFetch } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/addresses")({
  component: AddressesPage,
});

interface ApiAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  area: string;
  city: string;
  isDefault: boolean;
}

type Draft = Omit<ApiAddress, "id" | "isDefault">;

const EMPTY_DRAFT: Draft = { label: "Home", name: "", phone: "", line1: "", area: "", city: "" };

function AddressesPage() {
  const { getToken } = useAuth();
  const [list, setList] = useState<ApiAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await accountFetch<{ addresses: ApiAddress[] }>("/addresses", getToken());
      setList(Array.isArray(data.addresses) ? data.addresses : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startAdd() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setAdding((v) => !v);
  }

  function startEdit(a: ApiAddress) {
    setAdding(false);
    setEditingId(a.id);
    setDraft({ label: a.label, name: a.name, phone: a.phone, line1: a.line1, area: a.area, city: a.city });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editingId) {
        await accountFetch(`/addresses/${editingId}`, getToken(), {
          method: "PUT",
          body: JSON.stringify(draft),
        });
        toast.success("Address updated");
      } else {
        await accountFetch("/addresses", getToken(), {
          method: "POST",
          body: JSON.stringify(draft),
        });
        toast.success("Address added");
      }
      setDraft(EMPTY_DRAFT);
      setAdding(false);
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save address");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await accountFetch(`/addresses/${id}`, getToken(), { method: "DELETE" });
      toast.success("Address removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove address");
    }
  }

  async function makeDefault(id: string) {
    try {
      await accountFetch(`/addresses/${id}/default`, getToken(), { method: "PATCH" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't set default address");
    }
  }

  const formOpen = adding || editingId !== null;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
            <MapPin className="size-6" /> Saved addresses
          </h1>
          <p className="text-muted-foreground text-xs">
            {loading ? "Loading…" : `${list.length} saved ${list.length === 1 ? "location" : "locations"}`}
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={startAdd}>
          <Plus className="size-4" /> {adding ? "Cancel" : "Add address"}
        </Button>
      </header>

      {error && (
        <div className="surface-card text-muted-foreground rounded-3xl p-6 text-center text-sm">
          Couldn't load your addresses.{" "}
          <button onClick={load} className="text-primary underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={save} className="surface-card grid gap-3 rounded-3xl p-5 sm:grid-cols-2">
          <Field label="Label">
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </Field>
          <Field label="Full name">
            <Input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              required
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </Field>
          <Field label="Area">
            <Input
              required
              value={draft.area}
              onChange={(e) => setDraft({ ...draft, area: e.target.value })}
            />
          </Field>
          <Field label="Address line" wide>
            <Input
              required
              value={draft.line1}
              onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
            />
          </Field>
          <Field label="City">
            <Input
              required
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAdding(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update address" : "Save address"}
            </Button>
          </div>
        </form>
      )}

      {!loading && !error && list.length === 0 && (
        <div className="surface-card text-muted-foreground rounded-3xl p-8 text-center text-sm">
          No saved addresses yet — add one to speed up checkout.
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((a) => (
          <li
            key={a.id}
            className={cn(
              "surface-card relative rounded-3xl p-4",
              a.isDefault && "ring-primary ring-2",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-surface-muted rounded-pill px-2 py-0.5 text-[10px] font-medium">
                  {a.label}
                </span>
                {a.isDefault && (
                  <span className="bg-primary text-primary-foreground rounded-pill px-2 py-0.5 text-[10px] font-medium">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  aria-label="Edit address"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label="Remove address"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm leading-relaxed">
              <div className="font-medium">{a.name}</div>
              <div className="text-muted-foreground">
                {a.line1}
                <br />
                {a.area}, {a.city}
                <br />
                {a.phone}
              </div>
            </div>
            {!a.isDefault && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => makeDefault(a.id)}>
                <Star className="size-3.5" /> Make default
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
