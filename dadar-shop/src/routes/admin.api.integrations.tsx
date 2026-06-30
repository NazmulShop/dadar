import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/api/integrations")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Third-party Integrations"
        columns={["ID","Integration","Account","Connected on","Status","Actions"]}
        statuses={["Connected","Disconnected"]}
        primaryAction="Connect"
      />
    </AdminLayout>
  ),
});
