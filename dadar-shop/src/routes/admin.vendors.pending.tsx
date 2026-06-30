import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/vendors/pending")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Pending Vendor Approvals"
        columns={["ID","Vendor","Email","Applied","Documents","Actions"]}
        statuses={["Pending","Reviewing"]}
        primaryAction="Approve all"
      />
    </AdminLayout>
  ),
});
