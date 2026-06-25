import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, t, lang } = useAuth();
  const nav = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = async (e: React.FormEvent) => {
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
      const u = await login(email, password, remember);
      toast.success(
        lang === "bn"
          ? `স্বাগতম, ${u.name}`
          : `Welcome back, ${u.name}`,
      );
      const isSafeInternalPath = (p: string | undefined): p is string =>
        !!p && p.startsWith("/") && !p.startsWith("//") && !/^\/\\/.test(p);
      const dest =
        u.role === "admin"
          ? "/admin"
          : isSafeInternalPath(redirect)
            ? redirect
            : "/account";
      nav({ to: dest });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t("auth.welcome")} subtitle={t("auth.subtitle")}>
      <form className="space-y-4" onSubmit={submit} noValidate>
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
