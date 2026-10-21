"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CalendarClock,
  FlaskConical,
  GitMerge,
  History,
  LayoutDashboard,
  Loader2,
  Menu,
  Moon,
  Search,
  Send,
  Settings,
  ShieldBan,
  Sun,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useDemoStore } from "@/store/demo-store";
import { cn } from "@/lib/utils";

const OUTREACH_TICK_MS = 7000;

function useNavCounts() {
  const pendingReview = useDemoStore((s) => s.organisers.filter((o) => o.reviewStatus === "pending").length);
  const pendingMatches = useDemoStore((s) => s.matches.filter((m) => m.status === "pending").length);
  return { pendingReview, pendingMatches };
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { pendingReview, pendingMatches } = useNavCounts();
  const items = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/searches", label: "Searches", icon: Search },
    { href: "/schedules", label: "Schedules", icon: CalendarClock },
    { href: "/runs", label: "Runs", icon: History },
    { href: "/organisers", label: "Organisers", icon: Users, count: pendingReview },
    { href: "/matches", label: "Match review", icon: GitMerge, count: pendingMatches },
    { href: "/outreach", label: "Outreach", icon: Send },
    { href: "/suppression", label: "Suppression list", icon: ShieldBan },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon, count }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {count ? (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] tabular-nums">{count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-md">
        <Search className="size-4" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">Organiser Finder</div>
        <div className="text-muted-foreground text-xs">Proof of concept</div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}

/** Generates simulated replies, bounces and unsubscribes while the app is open. */
function OutreachSimulator() {
  const enabled = useDemoStore((s) => s.simulateOutreach);
  const tick = useDemoStore((s) => s.simulateOutreachEvent);
  React.useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(tick, OUTREACH_TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled, tick]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useDemoStore((s) => s.hydrated);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    Promise.resolve(useDemoStore.persist.rehydrate())
      .catch(() => undefined)
      .finally(() => {
        useDemoStore.getState().setHydrated();
        useDemoStore.getState().finishInterruptedRuns();
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
        <FlaskConical className="size-3.5 shrink-0" />
        Demo / proof of concept. All data is fake. No real scraping or sending.
      </div>
      <div className="flex flex-1">
        <aside className="bg-sidebar sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r p-3 lg:flex">
          <Brand />
          <NavLinks />
          <div className="text-muted-foreground mt-auto px-3 text-xs">Organiser Finder (POC)</div>
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="bg-sidebar gap-6 p-3">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand />
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur lg:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <div className="text-sm font-medium lg:hidden">Organiser Finder (POC)</div>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">
            {hydrated ? (
              children
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Loading demo data
              </div>
            )}
          </main>
        </div>
      </div>
      {hydrated && <OutreachSimulator />}
    </div>
  );
}
