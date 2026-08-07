import { supabase } from "@/integrations/supabase/client";

export type ProfileUpdate = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export const MAX_UPDATE_LENGTH = 500;

export async function fetchProfileUpdates(userId: string) {
  const { data, error } = await supabase
    .from("profile_updates")
    .select("id,user_id,body,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ProfileUpdate[];
}

export async function postProfileUpdate(userId: string, body: string) {
  const text = body.trim().slice(0, MAX_UPDATE_LENGTH);
  if (!text) throw new Error("Write something first.");
  const { error } = await supabase.from("profile_updates").insert({ user_id: userId, body: text });
  if (error) throw error;
}

export async function deleteProfileUpdate(id: string) {
  const { error } = await supabase.from("profile_updates").delete().eq("id", id);
  if (error) throw error;
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
