/**
 * auth.verify-email.tsx
 *
 * Single OTP verification page — reused for both:
 *   • User registration  (/auth/verify-email)
 *   • Admin login step 2 (/auth/verify-email?mode=admin&ticket=xxx&email=xxx)
 *
 * The UI is 100% identical for both flows.
 * The only difference is which API calls are made internally (mode param).
 * Backend enforces OTP type separation — register OTP cannot verify admin login.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  AuthInput,
  AuthLayout,
  PrimaryButton,
} from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({
    // "admin" mode uses a ticket from the login step.
    // "register" mode (default) uses the authenticated user session.
    mode: s.mode === "admin" ? ("admin" as const) : ("register" as const),
    ticket: typeof s.ticket === "string" ? s.ticket : "",
    email: typeof s.email === "string" ? s.email : "",
  }),
  component: VerifyEmailPage,
});

// ─── API origin ───────────────────────────────────────────────────────────────

const API_ORIGIN =
  ((import.meta as any).env?.VITE_API_URL as string | undefined) ?? "";

// ─── Hook: useOtpActions ──────────────────────────────────────────────────────
//
// Encapsulates the two actions (send/resend OTP, verify OTP) for both modes.
// The hook returns identical send/verify functions regardless of mode —
// the page component doesn't need to know which flow it's in.

function useOtpActions(opts: {
  mode: "register" | "admin";
  ticket: string;
  lang: string;
  nav: ReturnType<typeof useNavigate>;
  setCooldown: (n: number) => void;
}) {
  const { sendVerificationEmail, verifyEmail, verifyAdminOtp } = useAuth();
  const { mode, ticket, lang, nav, setCooldown } = opts;

  // ── Send / Resend ──────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (mode === "admin") {
      // Admin: resend via ticket-based endpoint (no session needed)
      const res = await fetch(`${API_ORIGIN}/api/auth/admin-login/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        devOtp?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to resend");
      setCooldown(60);
      toast.success(
        data.devOtp
          ? (lang === "bn" ? "কোড পাঠানো হয়েছে। ডেমো OTP: " : "Code sent. Demo OTP: ") +
              data.devOtp
          : lang === "bn"
            ? "কোড পাঠানো হয়েছে। আপনার ইমেইল চেক করুন।"
            : "Verification code sent — check your inbox.",
      );
    } else {
      // Register: resend via authenticated session
      const devOtp = await sendVerificationEmail();
      setCooldown(60);
      toast.success(
        devOtp
          ? (lang === "bn" ? "কোড পাঠানো হয়েছে। ডেমো OTP: " : "Code sent. Demo OTP: ") + devOtp
          : lang === "bn"
            ? "কোড পাঠানো হয়েছে। আপনার ইমেইল চেক করুন।"
            : "Verification code sent — check your inbox.",
      );
    }
  }, [mode, ticket, lang, nav, setCooldown, sendVerificationEmail]);

  // ── Verify ─────────────────────────────────────────────────────────────────
  const verify = useCallback(
    async (code: string) => {
      if (mode === "admin") {
        // Admin: verify OTP (type=admin_login enforced on backend)
        // then navigate to secret-key stage
        await verifyAdminOtp(ticket, code);
        nav({ to: "/auth/login", search: { adminTicket: ticket } });
      } else {
        // Register: verify email for current user (type=email_verify on backend)
        await verifyEmail(code);
        toast.success(lang === "bn" ? "ইমেইল যাচাই হয়েছে" : "Email verified");
        nav({ to: "/account" });
      }
    },
    [mode, ticket, lang, nav, verifyAdminOtp, verifyEmail],
  );

  return { send, verify };
}

// ─── Page component ───────────────────────────────────────────────────────────

function VerifyEmailPage() {
  const { user, t, lang } = useAuth();
  const nav = useNavigate();
  const { mode, ticket, email } = Route.useSearch();

  const isAdmin = mode === "admin";

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Admin: timer starts at 60 immediately (OTP was sent during login).
  // Register: timer starts at 0 (user must press "Send code" first).
  const [cooldown, setCooldown] = useState(isAdmin ? 60 : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const { send, verify } = useOtpActions({
    mode,
    ticket,
    lang,
    nav,
    setCooldown,
  });

  // Register mode needs an active session.
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

  const handleSend = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    try {
      await send();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error(t("auth.enterOtp"));
      return;
    }
    setBusy(true);
    try {
      await verify(code.trim());
    } catch (e2) {
      // Admin bootstrap edge case: OTP verified but admin account was just created
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

  // ── UI — identical for register and admin modes ───────────────────────────
  const displayEmail = isAdmin ? email : (user?.email ?? "");

  return (
    <AuthLayout
      title={t("auth.verifyEmailTitle")}
      subtitle={
        (lang === "bn" ? "কোড পাঠানো হবে: " : "We'll send a code to: ") +
        displayEmail
      }
    >
      <form className="space-y-4" onSubmit={handleVerify} noValidate>
        <PrimaryButton
          type="button"
          onClick={handleSend}
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
