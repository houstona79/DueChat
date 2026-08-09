import { supabase } from "@/integrations/supabase/client";

export type AlertLevel = "info" | "warning" | "critical";

export type Announcement = {
  id: string;
  body: string;
  level: AlertLevel;
  created_by: string;
  expires_at: string | null;
  created_at: string;
};

/** Alerts that have not expired yet, newest first. */
export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("announcements")
    .select("id,body,level,created_by,expires_at,created_at")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

/** Every alert including expired ones, for the admin panel. */
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("id,body,level,created_by,expires_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function sendAnnouncement(input: {
  body: string;
  level: AlertLevel;
  expiresInHours: number | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const expires_at =
    input.expiresInHours && input.expiresInHours > 0
      ? new Date(Date.now() + input.expiresInHours * 3_600_000).toISOString()
      : null;
  const { error } = await supabase.from("announcements").insert({
    body: input.body.trim(),
    level: input.level,
    expires_at,
    created_by: auth.user.id,
  });
  if (error) throw error;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

/** Ends an alert straight away without deleting the record. */
export async function expireAnnouncement(id: string) {
  const { error } = await supabase
    .from("announcements")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchMyDismissals(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("announcement_dismissals")
    .select("announcement_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.announcement_id);
}

export async function dismissAnnouncement(id: string, userId: string) {
  const { error } = await supabase
    .from("announcement_dismissals")
    .insert({ announcement_id: id, user_id: userId });
  if (error && error.code !== "23505") throw error;
}

export function levelLabel(level: AlertLevel) {
  return level === "critical" ? "Critical" : level === "warning" ? "Warning" : "Notice";
}
