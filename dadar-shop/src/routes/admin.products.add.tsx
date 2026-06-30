import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/products/add")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Add Product"
        columns={["Name","Category","Price","Stock","Status"]}
        statuses={["Draft","Active"]}
        primaryAction="Save product"
      />
    </AdminLayout>
  ),
});
