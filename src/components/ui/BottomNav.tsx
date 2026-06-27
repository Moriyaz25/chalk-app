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
    <>
      <div
        aria-hidden="true"
        className="h-[calc(4.75rem+env(safe-area-inset-bottom))] shrink-0"
      />
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1 px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "touch-manipulation select-none flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition active:scale-95",
                  isActive
                    ? "bg-chalk-amber/15 text-ink"
                    : "text-ink-soft/60 hover:bg-ink/5 hover:text-ink"
                )}
              >
                <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[11px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
