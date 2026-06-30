import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/products/attributes")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Product Attributes"
        columns={["ID","Attribute","Type","Values","Status","Actions"]}
        statuses={["Active","Disabled"]}
        primaryAction="Add attribute"
      />
    </AdminLayout>
  ),
});
