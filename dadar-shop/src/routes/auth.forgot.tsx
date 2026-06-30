import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AuthInput,
  AuthLayout,
  PrimaryButton,
} from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot")({
  component: ForgotPage,
});

function ForgotPage() {
  const { forgotPassword, t, lang } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentToken, setSentToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error(lang === "bn" ? "সঠিক ইমেইল দিন" : "Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const token = await forgotPassword(email);
      setSentToken(token || null);
      setSubmitted(true);
      toast.success(
        lang === "bn"
          ? "রিসেট লিংক পাঠানো হয়েছে।"
          : "If the email exists, a reset link was sent.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t("auth.forgotTitle")} subtitle={t("auth.forgotSub")}>
      {sentToken ? (
        <div className="space-y-4">
          <p className="rounded-2xl bg-primary/10 p-4 text-sm text-foreground">
            {lang === "bn"
              ? "ডেমো হিসেবে নিচের লিংকে ক্লিক করুন:"
              : "For this demo, click the link below to continue:"}
          </p>
          <button
            onClick={() => nav({ to: "/auth/reset", search: { token: sentToken } })}
            className="block w-full truncate rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm font-mono text-primary hover:bg-surface-muted"
          >
            /auth/reset?token={sentToken}
          </button>
        </div>
      ) : submitted ? (
        <div className="space-y-4">
          <p className="rounded-2xl bg-primary/10 p-4 text-sm text-foreground">
            {lang === "bn"
              ? "যদি এই ইমেইলে অ্যাকাউন্ট থাকে, একটি পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। আপনার ইনবক্স চেক করুন।"
              : "If an account exists for this email, a password reset link has been sent. Please check your inbox."}
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <AuthInput
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <PrimaryButton type="submit" loading={busy}>
            {t("auth.sendReset")}
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
