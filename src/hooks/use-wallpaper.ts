import { useCallback, useEffect, useState } from "react";

import bgWaves from "@/assets/bg-blue-waves.jpg";
import bgNight from "@/assets/bg-blue-night.jpg";
import bgGeo from "@/assets/bg-blue-geo.jpg";

const KEY = "duechat.wallpaper";
const EVENT = "duechat:wallpaper";

export type WallpaperId =
  | "none"
  | "waves"
  | "night"
  | "geo"
  | "sky"
  | "ice"
  | "teal"
  | "grape"
  | "gold"
  | "rose"
  | "forest"
  | "sunset"
  | "slate"
  | "midnight";

export type Wallpaper = {
  id: WallpaperId;
  label: string;
  /** CSS background-image value: a url() for photos, a gradient for colors. */
  src: string | null;
  kind: "none" | "photo" | "color";
  /** Perceived brightness of the background, used to auto-tune text contrast. */
  tone: "neutral" | "light" | "dark";
};

const gradient = (from: string, to: string) => `linear-gradient(160deg, ${from} 0%, ${to} 100%)`;

export const WALLPAPERS: Wallpaper[] = [
  { id: "none", label: "None", src: null, kind: "none", tone: "neutral" },
  { id: "waves", label: "Blue waves", src: `url(${bgWaves})`, kind: "photo", tone: "dark" },
  { id: "night", label: "Night sky", src: `url(${bgNight})`, kind: "photo", tone: "dark" },
  { id: "geo", label: "Blue facets", src: `url(${bgGeo})`, kind: "photo", tone: "dark" },
  { id: "sky", label: "Sky blue", src: gradient("#9fd4ff", "#3d7fd4"), kind: "color", tone: "light" },
  { id: "ice", label: "Ice", src: gradient("#eaf4ff", "#b9cfe6"), kind: "color", tone: "light" },
  { id: "teal", label: "Teal", src: gradient("#8fe3d9", "#1f7f83"), kind: "color", tone: "light" },
  { id: "grape", label: "Grape", src: gradient("#d3b3f0", "#5b1d8f"), kind: "color", tone: "dark" },
  { id: "gold", label: "Gold", src: gradient("#ffe9a8", "#d99a15"), kind: "color", tone: "light" },
  { id: "rose", label: "Rose", src: gradient("#ffd3e2", "#c2557f"), kind: "color", tone: "light" },
  { id: "forest", label: "Forest", src: gradient("#bfe6a8", "#2e6b3c"), kind: "color", tone: "light" },
  { id: "sunset", label: "Sunset", src: gradient("#ffc48a", "#b64a6a"), kind: "color", tone: "light" },
  { id: "slate", label: "Slate", src: gradient("#cfd8e3", "#5a6675"), kind: "color", tone: "light" },
  { id: "midnight", label: "Midnight", src: gradient("#31456b", "#0c1226"), kind: "color", tone: "dark" },
];

export function applyWallpaper(id: WallpaperId) {
  const found = WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]!;
  const root = document.documentElement;
  if (found.src) root.style.setProperty("--chat-wallpaper", found.src);
  else root.style.removeProperty("--chat-wallpaper");
  root.setAttribute("data-wallpaper", found.id);
  root.setAttribute("data-wallpaper-kind", found.kind);
  root.setAttribute("data-wallpaper-tone", found.tone);
  try {
    localStorage.setItem(KEY, found.id);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: found.id }));
  } catch {
    /* ignore */
  }
}

export function readStoredWallpaper(): WallpaperId {
  try {
    const stored = localStorage.getItem(KEY);
    if (WALLPAPERS.some((w) => w.id === stored)) return stored as WallpaperId;
  } catch {
    /* ignore */
  }
  return "none";
}

export function useWallpaper() {
  const [wallpaper, setWallpaper] = useState<WallpaperId>("none");

  useEffect(() => {
    const next = readStoredWallpaper();
    setWallpaper(next);
    applyWallpaper(next);
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<WallpaperId>).detail;
      if (id) setWallpaper(id);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setAndApply = useCallback((next: WallpaperId) => {
    setWallpaper(next);
    applyWallpaper(next);
  }, []);

  return { wallpaper, setWallpaper: setAndApply };
}
