import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlaceholderPage } from "@/components/admin/PlaceholderPage";

export const Route = createFileRoute("/admin/settings/otp")({
  component: () => (
    <AdminLayout>
      <PlaceholderPage
        title="OTP / SMS Config"
        columns={["Provider","Sender","Updated","Status","Actions"]}
        statuses={["Connected","Disconnected"]}
        primaryAction="Test send"
      />
    </AdminLayout>
  ),
});
