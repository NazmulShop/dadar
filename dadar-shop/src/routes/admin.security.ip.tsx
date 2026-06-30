import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/security/ip")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="IP Restrictions"
        columns={["ID","IP / Range","Rule","Note","Status","Actions"]}
        statuses={["Allow","Block"]}
        primaryAction="Add rule"
      />
    </AdminLayout>
  ),
});
