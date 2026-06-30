import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/reviews/moderation")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Review Moderation"
        columns={["ID","Product","Customer","Rating","Flag reason","Actions"]}
        statuses={["Flagged","Pending"]}
        primaryAction="Bulk approve"
      />
    </AdminLayout>
  ),
});
