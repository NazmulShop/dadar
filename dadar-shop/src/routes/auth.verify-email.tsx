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
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { user, sendVerificationEmail, verifyEmail, t, lang } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (!user) {
    return (
      <AuthLayout title={t("auth.verifyEmailTitle")}>
        <p className="text-sm text-muted-foreground">
          {lang === "bn"
            ? "প্রথমে সাইন ইন করুন।"
            : "Please sign in first."}
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

  const send = async () => {
    setBusy(true);
    try {
      const devOtp = await sendVerificationEmail();
      setCooldown(60);
      if (devOtp) {
        toast.success(
          (lang === "bn" ? "কোড পাঠানো হয়েছে। ডেমো OTP: " : "Code sent. Demo OTP: ") + devOtp,
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
    setBusy(true);
    try {
      await verifyEmail(code.trim());
      toast.success(lang === "bn" ? "ইমেইল যাচাই হয়েছে" : "Email verified");
      nav({ to: "/account" });
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.verifyEmailTitle")}
      subtitle={
        (lang === "bn" ? "কোড পাঠানো হবে: " : "We'll send a code to: ") + user.email
      }
    >
      <form className="space-y-4" onSubmit={verify} noValidate>
        <PrimaryButton type="button" onClick={send} loading={busy} disabled={cooldown > 0}>
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
        />
        <PrimaryButton type="submit" loading={busy}>
          {t("auth.verifyOtp")}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
