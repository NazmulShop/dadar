import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/themeStore";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  variant?: "pill" | "compact";
}

export function ThemeToggle({ className, variant = "pill" }: Props) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      onClick={toggle}
      className={cn(
        "tap-scale tap-scale-active bg-surface/70 relative flex items-center justify-center rounded-pill border border-border transition-colors hover:bg-surface",
        variant === "pill" ? "size-11" : "size-10",
        className,
      )}
    >
      <Sun
        className={cn(
          "size-[18px] transition-all",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
        strokeWidth={2.25}
      />
      <Moon
        className={cn(
          "absolute size-[18px] transition-all",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
        strokeWidth={2.25}
      />
    </button>
  );
}
