import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/orders/pending")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Pending Orders"
        columns={["Order","Customer","Total","Placed","Status","Actions"]}
        statuses={["Pending"]}
        primaryAction="Bulk update"
      />
    </AdminLayout>
  ),
});
