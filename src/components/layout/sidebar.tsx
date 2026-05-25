"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  FileUp,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badgeKey: null },
  { href: "/patients", label: "Patients", icon: Users, badgeKey: null },
  { href: "/seances", label: "Séances", icon: CalendarDays, badgeKey: null },
  { href: "/rappels", label: "Rappels", icon: Bell, badgeKey: "rappels" as const },
  { href: "/factures", label: "Factures", icon: Receipt, badgeKey: null },
  { href: "/kpi", label: "KPI", icon: BarChart3, badgeKey: null },
  { href: "/import-export", label: "Import / Export", icon: FileUp, badgeKey: null },
  { href: "/sauvegardes", label: "Sauvegardes", icon: ShieldCheck, badgeKey: null },
  { href: "/parametres", label: "Paramètres", icon: Settings, badgeKey: null }
] as const;

type SidebarBadges = { rappels?: number };

function SidebarContent({
  onNavigate,
  badges
}: {
  onNavigate?: () => void;
  badges: SidebarBadges;
}) {
  const pathname = usePathname();
  return (
    <>
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold leading-tight">PsychHub</div>
          <div className="text-xs text-muted-foreground">Cabinet de psychologie</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ href, label, icon: Icon, badgeKey }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const count = badgeKey ? badges[badgeKey] ?? 0 : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span
                  className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white"
                  aria-label={`${count} rappel${count > 1 ? "s" : ""} en attente`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-6 py-4 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Stockage local</div>
        <div>SQLite — protégé par BitLocker</div>
      </div>
    </>
  );
}

export function Sidebar({ rappelsCount = 0 }: { rappelsCount?: number }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges: SidebarBadges = { rappels: rappelsCount };

  return (
    <>
      <aside className="hidden h-screen w-64 flex-col border-r bg-card md:flex">
        <SidebarContent badges={badges} />
      </aside>

      <div className="fixed left-4 top-4 z-30 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="bg-card/95 backdrop-blur"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex flex-col p-0">
          <SidebarContent badges={badges} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
