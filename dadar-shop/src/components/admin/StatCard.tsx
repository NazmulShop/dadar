import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "violet" | "pink" | "cyan" | "green" | "orange";

const toneMap: Record<Tone, { ring: string; glow: string; icon: string; chip: string; accent: string }> = {
  violet: {
    ring: "oklch(0.68 0.26 305 / 0.55)",
    glow: "oklch(0.68 0.26 305 / 0.45)",
    icon: "from-[oklch(0.68_0.26_305)] to-[oklch(0.55_0.25_295)]",
    chip: "bg-[oklch(0.68_0.26_305/0.15)] text-[oklch(0.82_0.18_305)]",
    accent: "text-[oklch(0.85_0.16_305)]",
  },
  cyan: {
    ring: "oklch(0.82 0.16 200 / 0.55)",
    glow: "oklch(0.82 0.16 200 / 0.45)",
    icon: "from-[oklch(0.82_0.16_200)] to-[oklch(0.65_0.18_215)]",
    chip: "bg-[oklch(0.82_0.16_200/0.15)] text-[oklch(0.88_0.14_200)]",
    accent: "text-[oklch(0.88_0.14_200)]",
  },
  green: {
    ring: "oklch(0.82 0.22 150 / 0.55)",
    glow: "oklch(0.82 0.22 150 / 0.45)",
    icon: "from-[oklch(0.82_0.22_150)] to-[oklch(0.65_0.2_160)]",
    chip: "bg-[oklch(0.82_0.22_150/0.15)] text-[oklch(0.88_0.2_150)]",
    accent: "text-[oklch(0.88_0.2_150)]",
  },
  pink: {
    ring: "oklch(0.72 0.28 350 / 0.55)",
    glow: "oklch(0.72 0.28 350 / 0.45)",
    icon: "from-[oklch(0.72_0.28_350)] to-[oklch(0.6_0.26_340)]",
    chip: "bg-[oklch(0.72_0.28_350/0.15)] text-[oklch(0.85_0.22_350)]",
    accent: "text-[oklch(0.85_0.22_350)]",
  },
  orange: {
    ring: "oklch(0.78 0.2 55 / 0.55)",
    glow: "oklch(0.78 0.2 55 / 0.45)",
    icon: "from-[oklch(0.78_0.2_55)] to-[oklch(0.65_0.2_40)]",
    chip: "bg-[oklch(0.78_0.2_55/0.15)] text-[oklch(0.86_0.18_55)]",
    accent: "text-[oklch(0.86_0.18_55)]",
  },
};

export function StatCard({
  label, value, delta, icon: Icon, tone = "violet",
}: {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const up = (delta ?? 0) >= 0;
  const t = toneMap[tone];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-card/70 to-card/30 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5"
      style={{
        boxShadow: `inset 0 0 0 1px ${t.ring}, 0 0 28px -10px ${t.glow}, 0 8px 32px -12px rgb(0 0 0 / 0.5)`,
      }}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60" style={{ background: t.glow }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
          <div className={cn("mt-2 font-display text-[28px] font-bold leading-none tracking-tight", t.accent)}>
            {value}
          </div>
        </div>
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg", t.icon)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </div>
      </div>

      {typeof delta === "number" && (
        <div className="relative mt-4 flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
            up ? "bg-[oklch(0.82_0.22_150/0.15)] text-[oklch(0.85_0.22_150)]" : "bg-[oklch(0.68_0.25_18/0.15)] text-[oklch(0.78_0.22_18)]")}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {up ? "+" : ""}{delta}%
          </span>
          <span className="text-[11px] text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );
}
