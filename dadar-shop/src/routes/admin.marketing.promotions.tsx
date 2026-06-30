import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/marketing/promotions")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="Promotions"
        columns={["ID","Promotion","Type","Discount","Status","Actions"]}
        statuses={["Active","Scheduled","Ended"]}
        primaryAction="New promotion"
      />
    </AdminLayout>
  ),
});
