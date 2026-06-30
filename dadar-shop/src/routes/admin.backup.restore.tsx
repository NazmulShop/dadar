import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/backup/restore")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Restore Backup"
        columns={["ID","Backup","Created","Size","Type","Status","Actions"]}
        statuses={["Available","In progress"]}
        primaryAction="Restore backup"
      />
    </AdminLayout>
  ),
});
