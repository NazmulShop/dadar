import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AuthInput,
  AuthLayout,
  PrimaryButton,
} from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "admin" ? ("admin" as const) : ("register" as const),
    ticket: typeof s.ticket === "string" ? s.ticket : "",
    email: typeof s.email === "string" ? s.email : "",
  }),
  component: VerifyEmailPage,
});

const API_ORIGIN =
  ((import.meta as any).env?.VITE_API_URL as string | undefined) ?? "";

function VerifyEmailPage() {
  const { user, sendVerificationEmail, verifyEmail, verifyAdminOtp, t, lang } =
    useAuth();
  const nav = useNavigate();
  const { mode, ticket, email } = Route.useSearch();

  const isAdmin = mode === "admin";

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Admin mode starts at 60 because OTP was already sent during login.
  // Register mode starts at 0 so the user must press "Send code" first.
  const [cooldown, setCooldown] = useState(isAdmin ? 60 : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Register mode requires an authenticated session; admin mode uses a ticket.
  if (!isAdmin && !user) {
    return (
      <AuthLayout title={t("auth.verifyEmailTitle")}>
        <p className="text-sm text-muted-foreground">
          {lang === "bn" ? "প্রথমে সাইন ইন করুন।" : "Please sign in first."}
        </p>
        <Link
          to="/auth/login"
          className="mt-4 inline-block font-semibold text-primary hover:underline"
        >
          {t("auth.signin")}
        </Link>
      </AuthLayout>
    );
  }

  // ── Send / Resend OTP ──────────────────────────────────────────────────────
  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isAdmin) {
        // Admin resend: call the dedicated resend endpoint with the ticket.
        const res = await fetch(
          `${API_ORIGIN}/api/auth/admin-login/resend-otp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticket }),
          },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          devOtp?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to resend");
        setCooldown(60);
        toast.success(
          data.devOtp
            ? (lang === "bn"
                ? "কোড পাঠানো হয়েছে। ডেমো OTP: "
                : "Code sent. Demo OTP: ") + data.devOtp
            : lang === "bn"
              ? "কোড পাঠানো হয়েছে। আপনার ইমেইল চেক করুন।"
              : "Verification code sent — check your inbox.",
        );
      } else {
        // Register resend: uses the authenticated session.
        const devOtp = await sendVerificationEmail();
        setCooldown(60);
        toast.success(
          devOtp
            ? (lang === "bn"
                ? "কোড পাঠানো হয়েছে। ডেমো OTP: "
                : "Code sent. Demo OTP: ") + devOtp
            : lang === "bn"
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

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error(t("auth.enterOtp"));
      return;
    }
    setBusy(true);
    try {
      if (isAdmin) {
        // Admin: verify OTP then navigate to secret-key stage.
        await verifyAdminOtp(ticket, code.trim());
        nav({ to: "/auth/login", search: { adminTicket: ticket } });
      } else {
        // Register: verify email for current user.
        await verifyEmail(code.trim());
        toast.success(
          lang === "bn" ? "ইমেইল যাচাই হয়েছে" : "Email verified",
        );
        nav({ to: "/account" });
      }
    } catch (e2) {
      if ((e2 as any)?.adminPromoted) {
        toast.success(
          lang === "bn"
            ? "অ্যাডমিন অ্যাকাউন্ট তৈরি হয়েছে। নিরাপত্তার জন্য আবার সাইন ইন করুন।"
            : "Admin account created. Please sign in again to continue securely.",
        );
        nav({ to: "/auth/login" });
        return;
      }
      toast.error(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  const displayEmail = isAdmin ? email : (user?.email ?? "");

  return (
    <AuthLayout
      title={t("auth.verifyEmailTitle")}
      subtitle={
        (lang === "bn" ? "কোড পাঠানো হবে: " : "We'll send a code to: ") +
        displayEmail
      }
    >
      <form className="space-y-4" onSubmit={verify} noValidate>
        <PrimaryButton
          type="button"
          onClick={send}
          loading={busy}
          disabled={cooldown > 0}
        >
          {cooldown > 0
            ? (lang === "bn" ? "আবার পাঠান " : "Resend in ") + cooldown + "s"
            : t("auth.sendOtp")}
        </PrimaryButton>
        <AuthInput
          label={t("auth.enterOtp")}
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          autoFocus={isAdmin}
        />
        <PrimaryButton type="submit" loading={busy}>
          {t("auth.verifyOtp")}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
