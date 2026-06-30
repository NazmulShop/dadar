import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/orders/shipped")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Shipped Orders"
        columns={["Order","Customer","Courier","Tracking","Status","Actions"]}
        statuses={["Shipped","In transit"]}
        primaryAction="Print labels"
      />
    </AdminLayout>
  ),
});
