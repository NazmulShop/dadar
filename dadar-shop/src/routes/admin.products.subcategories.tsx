import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/products/subcategories")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Subcategories"
        columns={["ID","Subcategory","Parent","Products","Status","Actions"]}
        statuses={["Active","Hidden"]}
        primaryAction="Add subcategory"
      />
    </AdminLayout>
  ),
});
