import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/settings/currency")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Currency & Tax"
        columns={["Code","Currency","Rate","Symbol","Status","Actions"]}
        statuses={["Default","Enabled","Disabled"]}
        primaryAction="Add currency"
      />
    </AdminLayout>
  ),
});
