"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UserPlus, Settings } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Boards", icon: Home },
  { href: "/circles/new", label: "Connect", icon: UserPlus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide the nav while actively drawing — that screen wants full focus.
  if (pathname?.startsWith("/board/")) return null;

  return (
    <nav className="sticky bottom-0 z-20 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "bg-chalk-amber/15 text-ink"
                  : "text-ink-soft/60 hover:bg-ink/5 hover:text-ink"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
