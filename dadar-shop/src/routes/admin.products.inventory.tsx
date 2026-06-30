import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/products/inventory")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Inventory"
        columns={["SKU","Product","On hand","Reserved","Status","Actions"]}
        statuses={["In stock","Low","Out"]}
        primaryAction="Adjust stock"
      />
    </AdminLayout>
  ),
});
