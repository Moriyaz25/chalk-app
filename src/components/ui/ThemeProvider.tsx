"use client";

import { useEffect } from "react";

const THEME_KEY = "chalk-theme";
const THEME_EVENT = "chalk-theme-change";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = stored ?? (prefersDark ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return children;
}

export function setStoredTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function getCurrentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function subscribeToTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}
