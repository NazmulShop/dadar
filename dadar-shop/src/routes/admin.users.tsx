import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="All Users"
        columns={["ID","Name","Email","Role","Status","Joined","Actions"]}
        statuses={["Active","Pending","Banned"]}
        primaryAction="Invite user"
      />
    </AdminLayout>
  ),
});
