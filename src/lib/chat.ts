import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status_message: string | null;
  last_seen_at: string;
};

export type Room = {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  created_by: string;
  created_at: string;
};

export type Message = {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export const ONLINE_WINDOW_MS = 90_000;

export function isOnline(profile: Pick<Profile, "last_seen_at">) {
  return Date.now() - new Date(profile.last_seen_at).getTime() < ONLINE_WINDOW_MS;
}

const ACCENTS = ["accent-1", "accent-2", "accent-3", "accent-4"];

export function accentFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  return ACCENTS[hash % ACCENTS.length]!;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatTime(at: string | number) {
  const d = new Date(at);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "room"}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------- queries ---------- */

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, status_message, last_seen_at")
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, status_message, last_seen_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, slug, topic, created_by, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type Membership = { room_id: string; user_id: string };

export async function fetchMemberships(): Promise<Membership[]> {
  const { data, error } = await supabase.from("room_members").select("room_id, user_id");
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(roomId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, room_id, user_id, body, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(roomId: string, userId: string, body: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, user_id: userId, body });
  if (error) throw error;
}

export async function createRoom(userId: string, name: string, topic: string) {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ name: name.trim(), slug: slugify(name), topic: topic.trim() || null, created_by: userId })
    .select("id, name, slug, topic, created_by, created_at")
    .single();
  if (error) throw error;
  const join = await supabase.from("room_members").insert({ room_id: data.id, user_id: userId });
  if (join.error) throw join.error;
  return data as Room;
}

export async function joinRoom(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_members")
    .upsert({ room_id: roomId, user_id: userId }, { onConflict: "room_id,user_id" });
  if (error) throw error;
}

export async function leaveRoom(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function touchPresence(userId: string) {
  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "display_name" | "username" | "status_message" | "avatar_url">>,
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  await updateProfile(userId, { avatar_url: path });
  return path;
}

export async function signedAvatarUrl(path: string) {
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}
