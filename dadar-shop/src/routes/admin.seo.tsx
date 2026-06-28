import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookMarked, Save } from "lucide-react";
import { adminFetch, adminPost, adminPut, adminDelete, getAdminToken, API_ORIGIN } from "@/lib/adminApi";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/seo")({ component: SeoPage });

function SeoPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteTitle: "Dadar Shop – Bangladesh's Best Online Store",
    metaDescription: "Shop the latest fashion, electronics, home and lifestyle products at Dadar Shop.",
    keywords: "online shopping bangladesh, dadar shop, buy online bd",
    ogImage: "", canonicalUrl: "https://dadarshop.com",
    twitterHandle: "@dadarshop", googleAnalyticsId: "", googleTagManagerId: "",
    facebookPixelId: "", robotsTxt: "User-agent: *\nAllow: /\nDisallow: /admin/",
    sitemap: "https://dadarshop.com/sitemap.xml",
  });

  useEffect(() => {
    adminFetch("seo")
      .then(r => r.json()).then(d => { if (d && !d.error) setSettings(s => ({ ...s, ...d })); })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_ORIGIN}/api/admin/seo`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) toast.success("SEO settings saved"); else toast.error("Failed");
  }

  const F = ({ label, k, type = "text", placeholder = "" }: { label: string; k: keyof typeof settings; type?: string; placeholder?: string }) => (
    <div><Label>{label}</Label><Input className="mt-1" type={type} placeholder={placeholder} value={settings[k] as string} onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))} /></div>
  );

  const previewLength = settings.metaDescription.length;

  return (
    <AdminLayout>
      <header className="surface-card mb-4 rounded-3xl p-6">
        <h1 className="text-display flex items-center gap-2 text-3xl font-semibold"><BookMarked className="size-7 text-emerald-600" /> SEO Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure meta tags, analytics, and search engine settings.</p>
      </header>

      <div className="space-y-4">
        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Meta Tags</h3>
          <div className="space-y-3">
            <F label="Site Title" k="siteTitle" placeholder="Dadar Shop – …" />
            <div>
              <Label>Meta Description <span className={previewLength > 160 ? "text-rose-600" : "text-muted-foreground"}>({previewLength}/160)</span></Label>
              <textarea className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-20 resize-none"
                value={settings.metaDescription} onChange={e => setSettings(s => ({ ...s, metaDescription: e.target.value }))} />
            </div>
            <F label="Keywords (comma separated)" k="keywords" />
            <F label="Canonical URL" k="canonicalUrl" placeholder="https://dadarshop.com" />
            <F label="OG Image URL" k="ogImage" placeholder="https://…/og-image.jpg" />
            <F label="Twitter Handle" k="twitterHandle" placeholder="@yourshop" />
          </div>
        </div>

        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">Analytics & Tracking</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Google Analytics ID" k="googleAnalyticsId" placeholder="G-XXXXXXXXXX" />
            <F label="Google Tag Manager ID" k="googleTagManagerId" placeholder="GTM-XXXXXXX" />
            <F label="Facebook Pixel ID" k="facebookPixelId" placeholder="1234567890" />
            <F label="Sitemap URL" k="sitemap" placeholder="https://…/sitemap.xml" />
          </div>
        </div>

        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-4">robots.txt</h3>
          <textarea className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm h-32 resize-none font-mono"
            value={settings.robotsTxt} onChange={e => setSettings(s => ({ ...s, robotsTxt: e.target.value }))} />
        </div>

        <div className="surface-card rounded-3xl p-5">
          <h3 className="font-semibold text-sm mb-3">Google Search Preview</h3>
          <div className="bg-white rounded-2xl border border-border p-4 space-y-1">
            <div className="text-blue-800 text-base font-medium truncate">{settings.siteTitle || "Site Title"}</div>
            <div className="text-green-700 text-xs">{settings.canonicalUrl || "https://dadarshop.com"}</div>
            <div className="text-gray-700 text-xs leading-relaxed">{settings.metaDescription.slice(0, 160) || "Meta description…"}</div>
          </div>
        </div>

        <Button variant="hero" onClick={save} disabled={saving} className="w-full sm:w-auto">
          <Save className="size-4 mr-1" />{saving ? "Saving…" : "Save SEO Settings"}
        </Button>
      </div>
    </AdminLayout>
  );
}
