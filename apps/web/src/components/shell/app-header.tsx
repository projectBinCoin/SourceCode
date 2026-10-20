"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Recycle, Home, Wallet, Map, ClipboardList, History, Settings, Users, ScrollText, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const navItems: Record<Role, NavItem[]> = {
  citizen: [
    { href: "/citizen/dashboard", label: "Dashboard", icon: Home },
    { href: "/citizen/book-pickup", label: "Book Pickup", icon: ClipboardList },
    { href: "/citizen/register-bin", label: "Register Bin", icon: MapPin },
    { href: "/citizen/wallet", label: "Wallet", icon: Wallet },
  ],
  collector: [
    { href: "/collector/dashboard", label: "Map", icon: Map },
    { href: "/collector/history", label: "History", icon: History },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Map", icon: Map },
    { href: "/admin/collectors", label: "Collectors", icon: Users },
    { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
    { href: "/admin/bins", label: "Bins", icon: Recycle },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  if (!user) return null;

  const items = navItems[user.role];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#0099FF]/15 bg-background/80 backdrop-blur-xl">
      <div className="grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <BrandLogo className="h-9 w-9 rounded-lg shadow-sm sm:h-10 sm:w-10" />
            <span className="hidden bg-gradient-to-r from-[#003B73] to-[#0099FF] bg-clip-text text-lg font-bold text-transparent sm:inline dark:from-[#0066C5] dark:to-[#0099FF]">
              Bincoin
            </span>
          </Link>
        </div>
        {/* Centered nav — icon-only pills on tablets, icon + label from lg up */}
        <nav className="flex items-center gap-1 lg:gap-1.5" aria-label="Primary">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {/* Right corner: theme toggle + user menu */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
