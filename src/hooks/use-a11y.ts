import { useCallback, useEffect, useState } from "react";

export type TextScale = "100" | "112" | "125" | "150";

export type A11yPrefs = {
  /** Root font size percentage; every rem-based size scales with it. */
  textScale: TextScale;
  /** Boost contrast of text, borders and muted copy. */
  highContrast: boolean;
  /** Kill animations and smooth scrolling regardless of the OS setting. */
  reduceMotion: boolean;
  /** Always underline links, not just on hover. */
  underlineLinks: boolean;
  /** Enforce 44x44 minimum tap targets on buttons and links. */
  largeTargets: boolean;
  /** Stronger, thicker keyboard focus ring. */
  focusRing: boolean;
};

export const DEFAULT_A11Y: A11yPrefs = {
  textScale: "100",
  highContrast: false,
  reduceMotion: false,
  underlineLinks: false,
  largeTargets: false,
  focusRing: false,
};

export const A11Y_KEY = "duechat.a11y";

export const TEXT_SCALES: { value: TextScale; label: string }[] = [
  { value: "100", label: "Default" },
  { value: "112", label: "Large" },
  { value: "125", label: "Larger" },
  { value: "150", label: "Largest" },
];

export function readA11y(): A11yPrefs {
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    if (raw) return { ...DEFAULT_A11Y, ...(JSON.parse(raw) as Partial<A11yPrefs>) };
  } catch {
    /* ignore */
  }
  return DEFAULT_A11Y;
}

export function applyA11y(prefs: A11yPrefs) {
  const root = document.documentElement;
  root.dataset["a11yText"] = prefs.textScale;
  root.style.fontSize = `${Number(prefs.textScale)}%`;
  const flag = (name: string, on: boolean) => {
    if (on) root.setAttribute(name, "true");
    else root.removeAttribute(name);
  };
  flag("data-a11y-contrast", prefs.highContrast);
  flag("data-a11y-motion", prefs.reduceMotion);
  flag("data-a11y-links", prefs.underlineLinks);
  flag("data-a11y-targets", prefs.largeTargets);
  flag("data-a11y-focus", prefs.focusRing);
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function useA11y() {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_A11Y);

  useEffect(() => {
    const next = readA11y();
    setPrefs(next);
    applyA11y(next);
  }, []);

  const update = useCallback(<K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      applyA11y(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_A11Y);
    applyA11y(DEFAULT_A11Y);
  }, []);

  return { prefs, update, reset };
}
