import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/settings/email")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Email Config"
        columns={["Setting","Value","Updated","Status","Actions"]}
        statuses={["Connected","Disconnected"]}
        primaryAction="Test send"
      />
    </AdminLayout>
  ),
});
