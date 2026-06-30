import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/vendors/performance")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Vendor Performance"
        columns={["ID","Vendor","Orders","Rating","On-time %","Status","Actions"]}
        statuses={["Excellent","Good","Poor"]}
        primaryAction="Export report"
      />
    </AdminLayout>
  ),
});
