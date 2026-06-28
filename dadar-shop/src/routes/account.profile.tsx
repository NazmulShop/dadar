import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, Save, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/account/profile")({
  component: ProfileEdit,
});

function ProfileEdit() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = (user?.name?.trim() ? user.name.trim() : "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "—";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          await updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
          setSaved(true);
          toast.success("Profile updated");
          setTimeout(() => setSaved(false), 1800);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update profile");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-4"
    >
      <header>
        <h1 className="text-display text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-xs">Update your personal information.</p>
      </header>

      <section className="surface-card flex items-center gap-4 rounded-3xl p-5">
        <div className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full text-xl font-semibold">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold">{form.name || "Your name"}</div>
          <div className="text-muted-foreground text-xs">Member since {memberSince}</div>
        </div>
      </section>

      <section className="surface-card grid gap-4 rounded-3xl p-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs">
            <User className="mr-1 inline size-3" /> Full name
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs">
            <Mail className="mr-1 inline size-3" /> Email
          </Label>
          <Input id="email" type="email" value={form.email} disabled readOnly />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="phone" className="text-xs">
            <Phone className="mr-1 inline size-3" /> Phone
          </Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-success text-xs">Saved</span>}
        <Button type="submit" variant="hero" disabled={saving}>
          <Save className="size-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
