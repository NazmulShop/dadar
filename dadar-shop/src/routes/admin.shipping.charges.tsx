import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/shipping/charges")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Delivery Charges"
        columns={["ID","Rule","Zone","Charge","Conditions","Status","Actions"]}
        statuses={["Active","Disabled"]}
        primaryAction="Add rule"
      />
    </AdminLayout>
  ),
});
