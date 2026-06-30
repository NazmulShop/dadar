import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/support/help-center")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Help Center"
        columns={["ID","Article","Category","Views","Status","Actions"]}
        statuses={["Published","Draft"]}
        primaryAction="New article"
      />
    </AdminLayout>
  ),
});
