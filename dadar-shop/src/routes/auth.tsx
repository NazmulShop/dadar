import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Dadar Shop" },
      {
        name: "description",
        content:
          "Sign in or create your Dadar Shop account. OTP, email, Google or Facebook — fast and secure.",
      },
    ],
  }),
  component: () => <Outlet />,
});
