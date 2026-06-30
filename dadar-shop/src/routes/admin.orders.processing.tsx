import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/orders/processing")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Processing Orders"
        columns={["Order","Customer","Total","Placed","Status","Actions"]}
        statuses={["Processing"]}
        primaryAction="Bulk update"
      />
    </AdminLayout>
  ),
});
