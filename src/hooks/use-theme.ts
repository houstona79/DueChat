import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "duechat.theme";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const next = readStoredTheme();
    setTheme(next);
    applyTheme(next);
  }, []);

  const setAndApply = useCallback((next: Theme) => {
    setTheme(next);
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setAndApply(document.documentElement.classList.contains("dark") ? "light" : "dark");
  }, [setAndApply]);

  return { theme, setTheme: setAndApply, toggle };
}
