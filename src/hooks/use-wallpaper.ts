import { useCallback, useEffect, useState } from "react";

import bgWaves from "@/assets/bg-blue-waves.jpg";
import bgNight from "@/assets/bg-blue-night.jpg";
import bgGeo from "@/assets/bg-blue-geo.jpg";

const KEY = "duechat.wallpaper";
const EVENT = "duechat:wallpaper";

export type WallpaperId = "none" | "waves" | "night" | "geo";

export const WALLPAPERS: { id: WallpaperId; label: string; src: string | null }[] = [
  { id: "none", label: "None", src: null },
  { id: "waves", label: "Blue waves", src: bgWaves },
  { id: "night", label: "Night sky", src: bgNight },
  { id: "geo", label: "Blue facets", src: bgGeo },
];

export function applyWallpaper(id: WallpaperId) {
  const found = WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]!;
  const root = document.documentElement;
  if (found.src) root.style.setProperty("--chat-wallpaper", `url(${found.src})`);
  else root.style.removeProperty("--chat-wallpaper");
  root.setAttribute("data-wallpaper", found.id);
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
