"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { Home, Wallet, Map, ClipboardList, History, Settings, Users, ScrollText, Recycle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const navItems: Record<Role, { href: string; label: string; icon: typeof Home }[]> = {
  citizen: [
    { href: "/citizen/dashboard", label: "Home", icon: Home },
    { href: "/citizen/book-pickup", label: "Book", icon: ClipboardList },
    { href: "/citizen/register-bin", label: "Bin", icon: MapPin },
    { href: "/citizen/wallet", label: "Wallet", icon: Wallet },
  ],
  collector: [
    { href: "/collector/dashboard", label: "Map", icon: Map },
    { href: "/collector/history", label: "History", icon: History },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Map", icon: Map },
    { href: "/admin/collectors", label: "Staff", icon: Users },
    { href: "/admin/audit-log", label: "Audit", icon: ScrollText },
    { href: "/admin/bins", label: "Bins", icon: Recycle },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

export function MobileBottomNav() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  if (!user) return null;

  const items = navItems[user.role];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#0099FF]/15 bg-background/90 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-all",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                active && "bg-primary/15 shadow-sm"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
