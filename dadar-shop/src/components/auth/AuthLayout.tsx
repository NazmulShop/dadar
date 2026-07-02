import { Link } from "@tanstack/react-router";
import { Languages, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/authStore";
import { cn } from "@/lib/utils";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { lang, setLang, t } = useAuth();
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[color:var(--surface-muted)] via-background to-background">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-amber/20 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 pt-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <ShoppingBag className="h-4 w-4" />
          </span>
          <span className="font-serif text-xl tracking-tight">Dadar Shop</span>
        </Link>
        <button
          onClick={() => setLang(lang === "en" ? "bn" : "en")}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs font-medium backdrop-blur transition hover:bg-surface"
          aria-label="Toggle language"
        >
          <Languages className="h-3.5 w-3.5" />
          {lang === "en" ? "বাংলা" : "English"}
        </button>
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-col px-5 pb-16 pt-8">
        <div
          className={cn(
            "rounded-3xl border border-border/70 bg-card/80 p-6 shadow-card backdrop-blur-xl",
            "animate-in fade-in slide-in-from-bottom-4 duration-500",
          )}
        >
          <div className="mb-6 space-y-1.5">
            <h1 className="font-serif text-3xl leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("auth.tagline")}</p>
            )}
          </div>
          {children}
        </div>
        {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
      </main>
    </div>
  );
}

export function AuthInput({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        className={cn(
          "block w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70",
          "transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
          error && "border-destructive focus:border-destructive focus:ring-destructive/15",
          props.className,
        )}
      />
      {error ? (
        <span className="mt-1.5 block text-xs text-destructive">{error}</span>
      ) : null}
    </label>
  );
}

export function PrimaryButton({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        "group relative inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft",
        "transition-all duration-200 hover:shadow-glow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
      ) : (
        children
      )}
    </button>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

