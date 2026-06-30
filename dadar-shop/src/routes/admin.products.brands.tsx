import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/products/brands")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Brands"
        columns={["ID","Brand","Products","Status","Actions"]}
        statuses={["Active","Hidden"]}
        primaryAction="Add brand"
      />
    </AdminLayout>
  ),
});
