import { supabase } from "@/integrations/supabase/client";

export type ActiveSession = {
  id: string;
  user_id: string;
  session_key: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

/** A session counts as live if it checked in within this window. */
export const SESSION_STALE_MS = 3 * 60 * 1000;

const STORAGE_KEY = "duechat.session-key";

/** Stable per-tab/browser id used to tell one sign-in apart from another. */
export function localSessionKey(): string {
  if (typeof window === "undefined") return "server";
  let key = window.sessionStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    window.sessionStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

/** Records (or refreshes) this sign-in so admins can spot duplicate logins. */
export async function touchSession(userId: string) {
  const { error } = await supabase.from("active_sessions").upsert(
    {
      user_id: userId,
      session_key: localSessionKey(),
      user_agent:
        typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 300),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,session_key" },
  );
  if (error) throw error;
}

export async function endSession(userId: string) {
  await supabase
    .from("active_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("session_key", localSessionKey());
}

export async function fetchActiveSessions(): Promise<ActiveSession[]> {
  const since = new Date(Date.now() - SESSION_STALE_MS).toISOString();
  const { data, error } = await supabase
    .from("active_sessions")
    .select("id, user_id, session_key, user_agent, created_at, updated_at")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ActiveSession[];
}

/** Clears every recorded session for a member (admins only). */
export async function clearSessions(userId: string) {
  const { error } = await supabase.from("active_sessions").delete().eq("user_id", userId);
  if (error) throw error;
}

/** Accounts signed in from more than one place right now. */
export function multiSessionUsers(sessions: ActiveSession[]) {
  const byUser = new Map<string, ActiveSession[]>();
  for (const s of sessions) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }
  return [...byUser.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([userId, list]) => ({ userId, sessions: list }))
    .sort((a, b) => b.sessions.length - a.sessions.length);
}

/** Short, human label for a user agent string. */
export function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  return `${browser} · ${os}`;
}
