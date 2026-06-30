import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminWS } from "@/hooks/useAdminWS";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { Toaster } from "@/components/ui/sonner";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { systemAlert, dismissAlert } = useAdminWS();

  return (
    <div className="admin-shell">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          {systemAlert && (
            <SystemAlertBanner alert={systemAlert} onDismiss={dismissAlert} />
          )}
          <AdminTopbar />
          <main
            className={cn(
              "min-w-0 flex-1 p-4 sm:p-6 lg:p-8",
              systemAlert?.severity === "critical" && "pointer-events-none select-none opacity-60",
            )}
          >
            {children}
          </main>
        </SidebarInset>
        <Toaster richColors position="top-right" theme="dark" />
      </SidebarProvider>
    </div>
  );
}

/* ── System alert banner ── */
function SystemAlertBanner({
  alert, onDismiss,
}: {
  alert: { severity: "warning" | "critical"; code: string; message: string; solution: string; at: string };
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isCritical = alert.severity === "critical";

  return (
    <div className={cn(
      "sticky top-0 z-40 border-b-2 shadow-lg",
      isCritical ? "border-red-400 bg-red-600 text-white" : "border-amber-300 bg-amber-500 text-amber-950",
    )}>
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0 animate-pulse", isCritical ? "text-red-100" : "text-amber-900")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest",
              isCritical ? "bg-red-900/60 text-red-100" : "bg-amber-900/20 text-amber-950")}>
              {isCritical ? "Critical" : "Warning"} · {alert.code}
            </span>
            <span className="text-[11px] opacity-70">{new Date(alert.at).toLocaleTimeString()}</span>
          </div>
          <p className={cn("mt-1 text-sm font-semibold", isCritical ? "text-white" : "text-amber-950")}>{alert.message}</p>
          {expanded && alert.solution && (
            <div className={cn("mt-2 rounded-2xl px-4 py-3 text-sm",
              isCritical ? "bg-red-900/50 text-red-100" : "bg-amber-900/10 text-amber-950")}>
              <span className="font-semibold">How to fix: </span>{alert.solution}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setExpanded((e) => !e)} className="rounded-xl p-1.5 transition hover:bg-white/10">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={onDismiss} className="rounded-xl p-1.5 transition hover:bg-white/10" title="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
