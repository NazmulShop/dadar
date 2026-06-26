import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck, KeyRound } from "lucide-react";
import {
  AuthInput,
  AuthLayout,
  PrimaryButton,
} from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    // Set when arriving here from the passwordless-OTP page after the
    // backend recognized this as the Super Admin account: email ownership
    // is proven, but the secret-key step (verify-otp's ticket starts at
    // "otp_ok") still has to be completed before any session is created.
    adminTicket: typeof s.adminTicket === "string" ? s.adminTicket : undefined,
  }),
  component: LoginPage,
});

type Stage = "password" | "admin-otp" | "admin-secret";

function LoginPage() {
  const { login, verifyAdminOtp, verifyAdminSecret, t, lang } = useAuth();
  const nav = useNavigate();
  const { redirect, adminTicket } = Route.useSearch();

  const [stage, setStage] = useState<Stage>(adminTicket ? "admin-secret" : "password");

  // Step 1 — password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(!adminTicket);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Steps 2 & 3 — Super Admin verification (only ever reached for the
  // configured admin account; normal users never see these screens)
  const [ticket, setTicket] = useState(adminTicket ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [busy, setBusy] = useState(false);

  // If the URL's adminTicket changes (e.g. coming back from /auth/otp again),
  // re-sync local state to it.
  useEffect(() => {
    if (adminTicket) {
      setTicket(adminTicket);
      setStage("admin-secret");
    }
  }, [adminTicket]);

  const goToDestination = (role: string) => {
    const isSafeInternalPath = (p: string | undefined): p is string =>
      !!p && p.startsWith("/") && !p.startsWith("//") && !/^\/\\/.test(p);
    const dest =
      role === "admin" ? "/admin" : isSafeInternalPath(redirect) ? redirect : "/account";
    nav({ to: dest });
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = lang === "bn" ? "সঠিক ইমেইল দিন" : "Enter a valid email";
    if (password.length < 6)
      next.password = lang === "bn" ? "কমপক্ষে ৬ অক্ষর" : "Min 6 characters";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const result = await login(email, password, remember);
      if (result.kind === "admin_verification_required") {
        if (result.devOtp) {
          toast.success(
            (lang === "bn" ? "কোড পাঠানো হয়েছে। ডেমো OTP: " : "Code sent. Demo OTP: ") +
              result.devOtp,
          );
        } else {
          toast.success(
            lang === "bn"
              ? "যাচাই কোড পাঠানো হয়েছে। আপনার ইমেইল চেক করুন।"
              : "Verification code sent — check your inbox.",
          );
        }
        nav({
          to: "/auth/verify-email",
          search: { mode: "admin", ticket: result.ticket, email } as never,
        });
        return;
      }
      const u = result.user;
      toast.success(
        lang === "bn" ? `স্বাগতম, ${u.name}` : `Welcome back, ${u.name}`,
      );
      goToDestination(u.role);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      toast.error(t("auth.enterOtp"));
      return;
    }
    setBusy(true);
    try {
      await verifyAdminOtp(ticket, otpCode.trim());
      setStage("admin-secret");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitAdminSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      toast.error(t("auth.invalidSecret"));
      return;
    }
    setBusy(true);
    try {
      const u = await verifyAdminSecret(ticket, secretKey.trim(), remember);
      toast.success(
        lang === "bn" ? `স্বাগতম, ${u.name}` : `Welcome back, ${u.name}`,
      );
      goToDestination(u.role);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (stage === "admin-otp") {
    return (
      <AuthLayout title={t("auth.adminOtpTitle")} subtitle={t("auth.adminOtpSub")}>
        <form className="space-y-4" onSubmit={submitAdminOtp} noValidate>
          <div className="flex items-center justify-center text-primary">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <AuthInput
            label={t("auth.enterOtp")}
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
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

  if (stage === "admin-secret") {
    return (
      <AuthLayout title={t("auth.adminSecretTitle")} subtitle={t("auth.adminSecretSub")}>
        <form className="space-y-4" onSubmit={submitAdminSecret} noValidate>
          <div className="flex items-center justify-center text-primary">
            <KeyRound className="h-10 w-10" />
          </div>
          <AuthInput
            label={t("auth.secretKey")}
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="••••••••••••"
            autoFocus
          />
          <PrimaryButton type="submit" loading={busy}>
            {t("auth.continue")}
          </PrimaryButton>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.welcome")} subtitle={t("auth.subtitle")}>
      <form className="space-y-4" onSubmit={submitPassword} noValidate>
        <AuthInput
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={errors.email}
        />
        <div>
          <div className="relative">
            <AuthInput
              label={t("auth.password")}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={errors.password}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground"
              aria-label="toggle"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            {t("auth.remember")}
          </label>
          <Link
            to="/auth/forgot"
            className="font-medium text-primary hover:underline"
          >
            {t("auth.forgot")}
          </Link>
        </div>

        <PrimaryButton type="submit" loading={busy}>
          {t("auth.signin")}
        </PrimaryButton>

        <Link
          to="/auth/otp"
          className="block text-center text-sm font-medium text-primary hover:underline"
        >
          {t("auth.otpLogin")}
        </Link>

      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link to="/auth/register" className="font-semibold text-primary hover:underline">
          {t("auth.signup")}
        </Link>
      </p>
    </AuthLayout>
  );
}
