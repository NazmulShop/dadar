import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/orders/returns")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Returns & Refunds"
        columns={["RMA","Order","Customer","Reason","Status","Actions"]}
        statuses={["Requested","Approved","Rejected"]}
        primaryAction="New return"
      />
    </AdminLayout>
  ),
});
