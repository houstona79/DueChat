import { supabase } from "@/integrations/supabase/client";

export type ProfileUpdate = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  pinned_at: string | null;
};

export const MAX_UPDATE_LENGTH = 500;

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢", "🔥"] as const;

export type ReactionRow = { update_id: string; user_id: string; emoji: string };

export async function fetchProfileUpdateReactions(updateIds: string[]) {
  if (updateIds.length === 0) return [] as ReactionRow[];
  const { data, error } = await supabase
    .from("profile_update_reactions")
    .select("update_id,user_id,emoji")
    .in("update_id", updateIds);
  if (error) throw error;
  return (data ?? []) as ReactionRow[];
}

export async function toggleProfileUpdateReaction(
  updateId: string,
  userId: string,
  emoji: string,
  mine: boolean,
) {
  if (mine) {
    const { error } = await supabase
      .from("profile_update_reactions")
      .delete()
      .eq("update_id", updateId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("profile_update_reactions")
    .insert({ update_id: updateId, user_id: userId, emoji });
  if (error) throw error;
}

export async function fetchProfileUpdates(userId: string) {
  const { data, error } = await supabase
    .from("profile_updates")
    .select("id,user_id,body,created_at,updated_at,pinned_at")
    .eq("user_id", userId)
    .order("pinned_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ProfileUpdate[];
}

export async function editProfileUpdate(id: string, body: string) {
  const text = body.trim().slice(0, MAX_UPDATE_LENGTH);
  if (!text) throw new Error("Update can’t be empty.");
  const { error } = await supabase.from("profile_updates").update({ body: text }).eq("id", id);
  if (error) throw error;
}

export async function setProfileUpdatePinned(userId: string, id: string, pinned: boolean) {
  if (pinned) {
    // Only one pinned update at a time.
    const { error: clearError } = await supabase
      .from("profile_updates")
      .update({ pinned_at: null })
      .eq("user_id", userId)
      .not("pinned_at", "is", null);
    if (clearError) throw clearError;
  }
  const { error } = await supabase
    .from("profile_updates")
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
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
