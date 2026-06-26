import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AuthInput,
  AuthLayout,
  PrimaryButton,
} from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/admin-otp")({
  validateSearch: (s: Record<string, unknown>) => ({
    ticket: typeof s.ticket === "string" ? s.ticket : "",
    email: typeof s.email === "string" ? s.email : "",
  }),
  component: AdminOtpPage,
});

const API_ORIGIN =
  ((import.meta as any).env?.VITE_API_URL as string | undefined) ?? "";

function AdminOtpPage() {
  const { verifyAdminOtp, t, lang } = useAuth();
  const nav = useNavigate();
  const { ticket, email } = Route.useSearch();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(120); // starts at 120 — OTP already sent (2-minute window)

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // If no ticket, redirect back to login
  useEffect(() => {
    if (!ticket) nav({ to: "/auth/login" });
  }, [ticket, nav]);

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/auth/admin-login/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = await res.json() as { ok?: boolean; devOtp?: string; expiresInSeconds?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to resend");
      setCooldown(data.expiresInSeconds ?? 120);
      if (data.devOtp) {
        toast.success(
          (lang === "bn" ? "কোড পাঠানো হয়েছে। ডেমো OTP: " : "Code sent. Demo OTP: ") + data.devOtp,
        );
      } else {
        toast.success(
          lang === "bn"
            ? "কোড পাঠানো হয়েছে। আপনার ইমেইল চেক করুন।"
            : "Verification code sent — check your inbox.",
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error(t("auth.enterOtp"));
      return;
    }
    setBusy(true);
    try {
      await verifyAdminOtp(ticket, code.trim());
      // OTP verified — go to secret-key stage in login page
      nav({ to: "/auth/login", search: { adminTicket: ticket } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.verifyEmailTitle")}
      subtitle={
        (lang === "bn" ? "কোড পাঠানো হবে: " : "We'll send a code to: ") + email
      }
    >
      <form className="space-y-4" onSubmit={verify} noValidate>
        <PrimaryButton type="button" onClick={resend} loading={busy} disabled={cooldown > 0}>
          {cooldown > 0
            ? (lang === "bn" ? "আবার পাঠান " : "Resend in ") + cooldown + "s"
            : lang === "bn" ? "কোড পাঠান" : "Send code"}
        </PrimaryButton>
        <AuthInput
          label={t("auth.enterOtp")}
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          autoFocus
        />
        <PrimaryButton type="submit" loading={busy}>
          {t("auth.verifyOtp")}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
