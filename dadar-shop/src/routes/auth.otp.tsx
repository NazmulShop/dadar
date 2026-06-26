import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AuthInput,
  AuthLayout,
  PrimaryButton,
} from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/otp")({
  component: OtpPage,
});

function OtpPage() {
  const { requestOtp, verifyOtp, t, lang, otpCooldownSeconds } = useAuth();
  const nav = useNavigate();
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const send = async () => {
    if (!target.trim()) {
      toast.error(lang === "bn" ? "মান দিন" : "Enter a value");
      return;
    }
    setBusy(true);
    try {
      const devOtp = await requestOtp("email", target.trim());
      setRequested(true);
      setCooldown(otpCooldownSeconds);
      const isProd = (import.meta as any).env?.MODE === "production";
      if (!isProd && devOtp) {
        toast.success(
          (lang === "bn" ? "কোড পাঠানো হয়েছে। ডেমো OTP: " : "Code sent. Demo OTP: ") +
            devOtp,
        );
      } else {
        toast.success(
          lang === "bn" ? "কোড আপনার ইমেইলে পাঠানো হয়েছে।" : "Code sent to your email.",
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
    setBusy(true);
    try {
      const result = await verifyOtp(target.trim(), code.trim());
      if (result.kind === "admin_verification_required") {
        // This account is the configured Super Admin — passwordless OTP
        // proves email ownership but is not enough on its own. Send them
        // to finish with the secret-key step before any session exists.
        toast.success(
          lang === "bn"
            ? "ইমেইল যাচাই হয়েছে। এখন অ্যাডমিন সিক্রেট কোড দিন।"
            : "Email verified. Enter the admin secret key to finish.",
        );
        nav({ to: "/auth/login", search: { redirect: undefined, adminTicket: result.ticket } });
        return;
      }
      const u = result.user;
      toast.success(lang === "bn" ? "সাইন ইন সম্পন্ন" : "Signed in");
      nav({ to: u.role === "admin" ? "/admin" : "/account" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.otpLogin")}
      subtitle={
        lang === "bn"
          ? "পাসওয়ার্ড লাগবে না — কোড দিয়ে সাইন ইন।"
          : "No password needed — sign in with a code."
      }
    >
      <form className="space-y-4" onSubmit={verify} noValidate>
        <AuthInput
          label={t("auth.email")}
          type="email"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="you@example.com"
        />

        {requested ? (
          <>
            <AuthInput
              label={t("auth.enterOtp")}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
            />
            <PrimaryButton type="submit" loading={busy}>
              {t("auth.verifyOtp")}
            </PrimaryButton>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={send}
              className="block w-full text-center text-sm font-medium text-primary disabled:opacity-50"
            >
              {cooldown > 0
                ? (lang === "bn" ? "আবার পাঠান " : "Resend in ") + cooldown + "s"
                : t("auth.resend")}
            </button>
          </>
        ) : (
          <PrimaryButton type="button" loading={busy} onClick={send}>
            {t("auth.sendOtp")}
          </PrimaryButton>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/auth/login" className="font-semibold text-primary hover:underline">
          ← {t("auth.signin")}
        </Link>
      </p>
    </AuthLayout>
  );
}
