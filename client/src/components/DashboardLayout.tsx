import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { getThemeToggleLabel, getThemeToggleTitle } from "@/lib/theme";
import { MR_PAY_LOGO_URL } from "@/lib/brand";
import { canCreateUsers } from "@/lib/user-permissions";
import { Archive, BarChart3, ChevronRight, LogIn, LogOut, Moon, PanelLeft, Settings2, Sun, UserRound } from "lucide-react";
import React, { CSSProperties, useEffect, useRef, useState } from "react";

const menuItems = [
  { icon: Archive, label: "Inventário", active: true },
  { icon: BarChart3, label: "Visão geral", active: false },
];

const SIDEBAR_WIDTH_KEY = "asset-sidebar-width";
const DEFAULT_WIDTH = 244;
const MIN_WIDTH = 210;
const MAX_WIDTH = 360;

export default function DashboardLayout({
  children,
  onOpenAuth,
  onOpenUserCreate,
  isAdmin,
  onOverviewClick,
  onInventoryClick,
}: {
  children: React.ReactNode;
  onOpenAuth: () => void;
  onOpenUserCreate: () => void;
  isAdmin?: boolean;
  onOverviewClick: () => void;
  onInventoryClick: () => void;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { user, signOut } = useSupabaseAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
        user={user}
        onOpenAuth={onOpenAuth}
        onOpenUserCreate={onOpenUserCreate}
        isAdmin={isAdmin}
        onOverviewClick={onOverviewClick}
        onInventoryClick={onInventoryClick}
        onSignOut={signOut}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type LayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  user: ReturnType<typeof useSupabaseAuth>["user"];
  onOpenAuth: () => void;
  onOpenUserCreate: () => void;
  isAdmin?: boolean;
  onOverviewClick: () => void;
  onInventoryClick: () => void;
  onSignOut: () => Promise<void>;
};

function DashboardLayoutContent({ children, setSidebarWidth, user, onOpenAuth, onOpenUserCreate, isAdmin, onOverviewClick, onInventoryClick, onSignOut }: LayoutContentProps) {
  const { state, toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const isCollapsed = state === "collapsed";
  const [activeMenu, setActiveMenu] = useState(() => window.location.hash === "#visao-geral" ? "Visão geral" : "Inventário");
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = event.clientX - left;
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "OP";

  return (
    <>
      <div ref={sidebarRef} className="relative">
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-[76px] justify-center border-b border-sidebar-border px-3">
            <div className="flex w-full items-center gap-3">
              <button
                onClick={toggleSidebar}
                aria-label="Recolher menu lateral"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground transition hover:bg-sidebar-primary hover:text-sidebar-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <PanelLeft className="size-4" />
              </button>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="mb-2 flex h-10 w-[124px] items-center rounded-md bg-white px-2 py-1 shadow-sm ring-1 ring-white/10 dark:bg-white">
                    <img src={MR_PAY_LOGO_URL} alt="Mr Pay" loading="eager" decoding="async" className="h-auto max-h-9 w-full object-contain object-left" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="truncate text-sm font-semibold tracking-tight">Mr Pay Ativos</span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/45">Operações de Ativos</p>
                </div>
              )}
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-5">
            {!isCollapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">Workspace</p>}
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={activeMenu === item.label}
                    tooltip={item.label}
                    data-testid={item.label === "Visão geral" ? "overview-button" : "inventory-button"}
                    data-active={activeMenu === item.label ? "true" : "false"}
                    className={cn("h-10 rounded-xl px-3 text-sm", activeMenu === item.label && "font-semibold")}
                    onClick={() => { setActiveMenu(item.label); if (item.label === "Visão geral") onOverviewClick(); else onInventoryClick(); }}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                    {activeMenu === item.label && !isCollapsed && <ChevronRight className="ml-auto size-3.5 opacity-50" />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            {canCreateUsers(Boolean(user), isAdmin ? "admin" : "operador") && <div className="mt-3 px-1"><Button data-testid="create-user-button" onClick={onOpenUserCreate} variant="outline" size={isCollapsed ? "icon" : "sm"} title="Criar usuário" className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><UserRound className="size-3.5" />{!isCollapsed && <span className="ml-2">Criar usuário</span>}</Button></div>}
            {!isCollapsed && (
              <div className="mt-8 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-3">
                <div className="flex items-center gap-2 text-sidebar-foreground/65">
                  <Settings2 className="size-3.5" />
                  <span className="text-[11px] font-medium">Ambiente operacional</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-sidebar-foreground/45">Dados sincronizados com a base do cliente.</p>
              </div>
            )}
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-3">
            {user ? (
              <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
                <Avatar className="size-8 border border-sidebar-border">
                  <AvatarFallback className="bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-sidebar-foreground">{user.user_metadata?.full_name || user.email}</p>
                    <p className="truncate text-[10px] text-sidebar-foreground/45">Operador conectado</p>
                  </div>
                )}
                {!isCollapsed && (
                  <button onClick={() => void onSignOut()} aria-label="Sair" className="rounded-lg p-1.5 text-sidebar-foreground/45 transition hover:bg-sidebar-accent hover:text-sidebar-foreground">
                    <LogOut className="size-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <Button onClick={onOpenAuth} variant="outline" size={isCollapsed ? "icon" : "sm"} className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <LogIn className="size-3.5" />
                {!isCollapsed && <span>Entrar no sistema</span>}
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>
        <div className={cn("absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/25", isCollapsed && "hidden")} onMouseDown={() => setIsResizing(true)} />
      </div>
      <SidebarInset className="min-w-0 bg-background">
        <div className="sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="size-9 rounded-xl border border-border/70 bg-card text-muted-foreground hover:bg-muted md:hidden" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operações / Ativos</p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">Controle patrimonial</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Sistema online
            </span>
            {canCreateUsers(Boolean(user), isAdmin ? "admin" : "operador") && <Button type="button" data-testid="create-user-header-button" onClick={onOpenUserCreate} variant="outline" size="sm" className="h-9 rounded-xl bg-card px-2.5 text-xs sm:px-3"><UserRound className="mr-1.5 size-3.5" /><span className="hidden sm:inline">Criar usuário</span></Button>}
            {toggleTheme && <Button type="button" variant="outline" size="icon" onClick={toggleTheme} aria-label={getThemeToggleLabel(theme)} title={getThemeToggleTitle(theme)} className="size-9 rounded-xl bg-card">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>}
            {!user && <Button onClick={onOpenAuth} size="sm" className="h-9 rounded-xl px-3 text-xs shadow-sm"><LogIn className="mr-1.5 size-3.5" /> Entrar</Button>}
          </div>
        </div>
        <main className="min-w-0 flex-1 p-4 sm:p-7">{children}</main>
      </SidebarInset>
    </>
  );
}
