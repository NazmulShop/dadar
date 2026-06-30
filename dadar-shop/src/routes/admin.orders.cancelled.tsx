import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/orders/cancelled")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Cancelled Orders"
        columns={["Order","Customer","Total","Reason","Status","Actions"]}
        statuses={["Cancelled","Refunded"]}
        primaryAction="Export"
      />
    </AdminLayout>
  ),
});
