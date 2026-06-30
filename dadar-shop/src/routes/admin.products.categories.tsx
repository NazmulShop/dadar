import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/products/categories")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Categories"
        columns={["ID","Category","Products","Slug","Status","Actions"]}
        statuses={["Active","Hidden"]}
        primaryAction="Add category"
      />
    </AdminLayout>
  ),
});
