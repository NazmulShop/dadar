import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/support/complaints")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Complaints"
        columns={["ID","Customer","Subject","Severity","Status","Actions"]}
        statuses={["Open","Resolved"]}
        primaryAction="Log complaint"
      />
    </AdminLayout>
  ),
});
