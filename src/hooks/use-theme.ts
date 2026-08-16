import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "duechat.theme";
const SKIN_KEY = "duechat.skin";

export type SkinId =
  | "msn"
  | "yahoo"
  | "aol"
  | "midnight"
  | "ocean"
  | "plum"
  | "ember"
  | "forest"
  | "slate";

export const SKINS: { id: SkinId; label: string; swatch: string }[] = [
  { id: "msn", label: "MSN", swatch: "linear-gradient(180deg,#eaf4ff,#3c8ee0)" },
  { id: "yahoo", label: "Yahoo!", swatch: "linear-gradient(180deg,#efe3ff,#6b2fa0)" },
  { id: "aol", label: "AOL", swatch: "linear-gradient(180deg,#d6e9ff,#0a4ea8)" },
  { id: "midnight", label: "Midnight", swatch: "oklch(0.649 0.176 262)" },
  { id: "ocean", label: "Ocean", swatch: "oklch(0.72 0.13 195)" },
  { id: "plum", label: "Plum", swatch: "oklch(0.68 0.17 320)" },
  { id: "ember", label: "Ember", swatch: "oklch(0.7 0.16 45)" },
  { id: "forest", label: "Forest", swatch: "oklch(0.68 0.15 155)" },
  { id: "slate", label: "Slate", swatch: "oklch(0.7 0.03 264)" },
];

export function applySkin(skin: SkinId) {
  document.documentElement.setAttribute("data-skin", skin);
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    /* ignore */
  }
}

export function readStoredSkin(): SkinId {
  try {
    const stored = localStorage.getItem(SKIN_KEY);
    if (SKINS.some((s) => s.id === stored)) return stored as SkinId;
  } catch {
    /* ignore */
  }
  return "msn";
}

export function useSkin() {
  const [skin, setSkin] = useState<SkinId>("msn");

  useEffect(() => {
    const next = readStoredSkin();
    setSkin(next);
    applySkin(next);
  }, []);

  const setAndApply = useCallback((next: SkinId) => {
    setSkin(next);
    applySkin(next);
  }, []);

  return { skin, setSkin: setAndApply };
}

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
