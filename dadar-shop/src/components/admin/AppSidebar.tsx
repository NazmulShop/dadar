import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, ShoppingBag } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { useAuth } from "@/lib/authStore";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isActive = (to: string) =>
    to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(to + "/");

  const initials = (user?.name ?? "DS")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Sidebar collapsible="icon">
      {/* ── Brand Header ── */}
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.68_0.26_305)] to-[oklch(0.72_0.28_350)] text-white shadow-[0_0_20px_-4px_oklch(0.68_0.26_305/0.8)]">
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-bold tracking-wide text-sidebar-foreground">
              Dadar Shop
            </span>
            <span className="rounded-md bg-[oklch(0.72_0.28_350/0.18)] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[oklch(0.85_0.2_340)]">
              ADMIN
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="px-1">
        <SidebarGroup>
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
            Main Menu
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV.map((section) => {
                /* ── Leaf item ── */
                if (!section.children) {
                  const active = isActive(section.to!);
                  return (
                    <SidebarMenuItem key={section.title}>
                      <SidebarMenuButton
                        asChild isActive={active} tooltip={section.title}
                        className={active ? "bg-gradient-to-r from-[oklch(0.68_0.26_305/0.25)] to-[oklch(0.72_0.28_350/0.1)] text-white shadow-[inset_0_0_0_1px_oklch(0.68_0.26_305/0.5),0_0_18px_-6px_oklch(0.68_0.26_305/0.6)]" : ""}
                      >
                        <Link to={section.to!}>
                          <section.icon />
                          <span>{section.title}</span>
                          {active && <ChevronRight className="ml-auto h-4 w-4 text-[oklch(0.82_0.16_200)]" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                /* ── Collapsible group ── */
                const anyActive = section.children.some((c) => isActive(c.to));
                return (
                  <Collapsible
                    key={section.title}
                    defaultOpen={anyActive}
                    className="group/collapsible"
                    asChild
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={section.title}
                          isActive={anyActive}
                          className={anyActive ? "text-white" : ""}
                        >
                          <section.icon />
                          <span>{section.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {section.children.map((child) => (
                            <SidebarMenuSubItem key={child.to + child.title}>
                              <SidebarMenuSubButton asChild isActive={isActive(child.to)}>
                                <Link to={child.to}>{child.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="gap-3 border-t border-sidebar-border">
        <Link
          to="/account"
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
        >
          <span className="group-data-[collapsible=icon]:hidden">← Back to storefront</span>
        </Link>
        <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-2 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-[oklch(0.82_0.22_150/0.6)]">
              <AvatarFallback className="bg-gradient-to-br from-[oklch(0.68_0.26_305)] to-[oklch(0.72_0.28_350)] text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-[oklch(0.82_0.22_150)] shadow-[0_0_8px_oklch(0.82_0.22_150)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">{user?.name ?? "Admin"}</div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">Administrator</div>
          </div>
          <ChevronRight className="h-4 w-4 text-sidebar-foreground/40" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
