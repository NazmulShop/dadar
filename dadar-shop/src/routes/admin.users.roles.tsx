import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/users/roles")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="User Roles"
        columns={["ID","Role","Members","Permissions","Status","Actions"]}
        statuses={["Active","Disabled"]}
        primaryAction="Add role"
      />
    </AdminLayout>
  ),
});
