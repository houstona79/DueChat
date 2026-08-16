import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

import bgWaves from "@/assets/bg-blue-waves.jpg";
import bgNight from "@/assets/bg-blue-night.jpg";
import bgGeo from "@/assets/bg-blue-geo.jpg";

const KEY = "duechat.wallpaper";
const ROOM_PREFIX = "duechat.wallpaper.room:";
const EVENT = "duechat:wallpaper";

/** Storage key of the thread whose wallpaper is currently being shown, if any. */
let activeScope: string | null = null;

const scopeKey = (threadId: string) => `${ROOM_PREFIX}${threadId}`;

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
    localStorage.setItem(activeScope ? scopeKey(activeScope) : KEY, found.id);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: found.id }));
  } catch {
    /* ignore */
  }
  if (activeScope) void saveRoomWallpaper(activeScope, found.id);
}

/** Persist a room's background to the account so it syncs across devices. */
async function saveRoomWallpaper(roomId: string, wallpaperId: WallpaperId) {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase
      .from("room_wallpapers")
      .upsert(
        { user_id: userId, room_id: roomId, wallpaper_id: wallpaperId },
        { onConflict: "user_id,room_id" },
      );
  } catch {
    /* offline or signed out: the local copy still applies */
  }
}

async function fetchRoomWallpaper(roomId: string): Promise<WallpaperId | null> {
  try {
    const { data } = await supabase
      .from("room_wallpapers")
      .select("wallpaper_id")
      .eq("room_id", roomId)
      .maybeSingle();
    const id = data?.wallpaper_id;
    if (id && WALLPAPERS.some((w) => w.id === id)) return id as WallpaperId;
  } catch {
    /* ignore */
  }
  return null;
}

export function readStoredWallpaper(threadId?: string | null): WallpaperId {
  try {
    if (threadId) {
      const scoped = localStorage.getItem(scopeKey(threadId));
      if (WALLPAPERS.some((w) => w.id === scoped)) return scoped as WallpaperId;
    }
    const stored = localStorage.getItem(KEY);
    if (WALLPAPERS.some((w) => w.id === stored)) return stored as WallpaperId;
  } catch {
    /* ignore */
  }
  return "none";
}

/**
 * Scope wallpaper changes to one chat thread: picking a background while the
 * thread is open saves and restores that choice per room.
 */
export function useThreadWallpaper(threadId: string | null | undefined) {
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    activeScope = threadId;
    applyWallpaper(readStoredWallpaper(threadId));
    // Pull the account-level choice so a pick made on another device wins.
    void fetchRoomWallpaper(threadId).then((remote) => {
      if (cancelled || !remote || activeScope !== threadId) return;
      try {
        localStorage.setItem(scopeKey(threadId), remote);
      } catch {
        /* ignore */
      }
      applyWallpaper(remote);
    });
    return () => {
      cancelled = true;
      if (activeScope === threadId) activeScope = null;
      applyWallpaper(readStoredWallpaper());
    };
  }, [threadId]);
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
