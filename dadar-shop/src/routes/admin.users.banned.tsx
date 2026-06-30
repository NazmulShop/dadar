import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/users/banned")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Banned Users"
        columns={["ID","Name","Email","Reason","Banned on","Actions"]}
        statuses={["Banned","Under review"]}
        primaryAction="Ban user"
      />
    </AdminLayout>
  ),
});
