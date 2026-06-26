import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import {
  AuthInput,
  AuthLayout,
  PrimaryButton,
} from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  component: ResetPage,
});

function ResetPage() {
  const { resetPassword, t, lang } = useAuth();
  const { token } = useSearch({ from: "/auth/reset" });
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | undefined>();
  const [confirmErr, setConfirmErr] = useState<string | undefined>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr(undefined);
    setConfirmErr(undefined);
    if (pw.length < 8) {
      setPwErr(lang === "bn" ? "কমপক্ষে ৮ অক্ষর" : "At least 8 characters");
      return;
    }
    if (pw !== confirm) {
      setConfirmErr(lang === "bn" ? "পাসওয়ার্ড মিলছে না" : "Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, pw);
      toast.success(
        lang === "bn" ? "পাসওয়ার্ড আপডেট হয়েছে" : "Password updated",
      );
      nav({ to: "/auth/login" });
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t("auth.resetTitle")}>
      {!token ? (
        <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          {lang === "bn"
            ? "অবৈধ লিংক। আবার রিসেট চাইতে হবে।"
            : "Invalid link. Please request another reset."}
        </p>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <AuthInput
            label={t("auth.newPassword")}
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
            error={pwErr}
          />
          <AuthInput
            label={t("auth.confirmPassword")}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            error={confirmErr}
          />
          <PrimaryButton type="submit" loading={busy}>
            {t("auth.resetBtn")}
          </PrimaryButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/auth/login" className="font-semibold text-primary hover:underline">
          ← {t("auth.signin")}
        </Link>
      </p>
    </AuthLayout>
  );
}
