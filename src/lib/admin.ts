import { supabase } from "@/integrations/supabase/client";
import type { Message, Profile, Room } from "@/lib/chat";

export type AppRole = "admin" | "moderator" | "user";
export type UserRole = { id: string; user_id: string; role: AppRole };
export type SiteBan = {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  created_at: string;
};

export async function fetchSiteBans(): Promise<SiteBan[]> {
  const { data, error } = await supabase
    .from("site_bans")
    .select("id, user_id, banned_by, reason, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SiteBan[];
}

export async function banUser(userId: string, reason?: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { error } = await supabase.from("site_bans").insert({
    user_id: userId,
    banned_by: auth.user.id,
    reason: reason?.trim() ? reason.trim() : null,
  });
  if (error) throw error;
}

export async function unbanUser(userId: string) {
  const { error } = await supabase.from("site_bans").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function fetchRoles(): Promise<UserRole[]> {
  const { data, error } = await supabase.from("user_roles").select("id, user_id, role");
  if (error) throw error;
  return (data ?? []) as UserRole[];
}

export async function grantRole(userId: string, role: AppRole) {
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (error) throw error;
}

export async function revokeRole(userId: string, role: AppRole) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw error;
}

export async function deleteRoom(roomId: string) {
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw error;
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  if (error) throw error;
}

export async function fetchRecentMessages(limit = 100): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, room_id, user_id, body, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type AdminSnapshot = {
  profiles: Profile[];
  rooms: Room[];
  roles: UserRole[];
  messages: Message[];
  memberships: { room_id: string; user_id: string }[];
  bans: SiteBan[];
};

export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  const [profiles, rooms, roles, messages, memberships, bans] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, status_message, last_seen_at")
      .order("display_name"),
    supabase
      .from("rooms")
      .select("id, name, slug, topic, created_by, created_at, is_direct, direct_key")
      .order("created_at", { ascending: false }),
    fetchRoles(),
    fetchRecentMessages(120),
    supabase.from("room_members").select("room_id, user_id"),
    fetchSiteBans(),
  ]);
  if (profiles.error) throw profiles.error;
  if (rooms.error) throw rooms.error;
  if (memberships.error) throw memberships.error;
  return {
    profiles: (profiles.data ?? []) as Profile[],
    rooms: (rooms.data ?? []) as Room[],
    roles,
    messages,
    memberships: memberships.data ?? [],
    bans,
  };
}
