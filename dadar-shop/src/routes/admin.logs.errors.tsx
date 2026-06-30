import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/logs/errors")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Error Logs"
        columns={["ID","Type","Message","Source","Time","Level"]}
        statuses={["Error","Critical","Warning"]}
        primaryAction="Export"
      />
    </AdminLayout>
  ),
});
