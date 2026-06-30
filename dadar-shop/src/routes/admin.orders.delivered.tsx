import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/orders/delivered")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Delivered Orders"
        columns={["Order","Customer","Total","Delivered on","Status","Actions"]}
        statuses={["Delivered"]}
        primaryAction="Export"
      />
    </AdminLayout>
  ),
});
