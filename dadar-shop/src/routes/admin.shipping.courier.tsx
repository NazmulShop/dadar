import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/shipping/courier")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Courier Integration"
        columns={["ID","Courier","Account","Coverage","Status","Actions"]}
        statuses={["Connected","Disconnected"]}
        primaryAction="Connect courier"
      />
    </AdminLayout>
  ),
});
