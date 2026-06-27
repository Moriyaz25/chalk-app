"use client";

import { useEffect } from "react";

const THEME_KEY = "chalk-theme";
const THEME_EVENT = "chalk-theme-change";
export type ThemeChoice = "light" | "dark" | "system";

function applyTheme(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const choice: ThemeChoice =
      stored === "light" || stored === "dark" ? stored : "system";
    applyTheme(choice);
    document.documentElement.dataset.reducedMotion =
      localStorage.getItem("chalk-reduced-motion") || "false";
    window.dispatchEvent(new Event(THEME_EVENT));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getThemePreference() === "system") {
        applyTheme("system");
        window.dispatchEvent(new Event(THEME_EVENT));
      }
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  return children;
}

export function setStoredTheme(theme: ThemeChoice) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function getCurrentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function getThemePreference(): ThemeChoice {
  const value = localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export function subscribeToTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}
