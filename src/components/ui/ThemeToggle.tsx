"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  getCurrentTheme,
  getThemePreference,
  setStoredTheme,
  subscribeToTheme,
} from "@/components/ui/ThemeProvider";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getCurrentTheme, () => "light");
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setStoredTheme(next);
      }}
      className="relative inline-flex h-10 w-[76px] items-center rounded-full border border-line bg-card-muted p-1 text-ink transition-colors"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span
        className={`absolute top-1 h-8 w-8 rounded-full bg-card shadow-sm transition-transform ${
          isDark ? "translate-x-9" : "translate-x-0"
        }`}
      />
      <span className="relative z-10 flex h-8 w-8 items-center justify-center">
        <Sun size={15} className={isDark ? "text-ink-soft/50" : "text-chalk-amber"} />
      </span>
      <span className="relative z-10 flex h-8 w-8 items-center justify-center">
        <Moon size={15} className={isDark ? "text-chalk-sky" : "text-ink-soft/50"} />
      </span>
    </button>
  );
}

export function ThemeModeSelect() {
  const preference = useSyncExternalStore(
    subscribeToTheme,
    getThemePreference,
    () => "system" as const
  );
  return (
    <select
      value={preference}
      onChange={(event) => setStoredTheme(event.target.value as "light" | "dark" | "system")}
      aria-label="Color theme"
      className="rounded-full border border-line bg-card-muted px-3 py-2 text-xs font-semibold text-ink outline-none"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
