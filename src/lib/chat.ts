import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status_message: string | null;
  name_color: string | null;
  last_seen_at: string;
};

export type Room = {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  created_by: string;
  created_at: string;
  is_direct: boolean;
  direct_key: string | null;
  radio_url: string | null;
  radio_name: string | null;
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
    .select("id, username, display_name, avatar_url, status_message, name_color, last_seen_at")
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, status_message, name_color, last_seen_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, name, slug, topic, created_by, created_at, is_direct, direct_key, radio_url, radio_name",
    )
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type Membership = { room_id: string; user_id: string };

export type RoomEvent = {
  id: string;
  room_id: string;
  user_id: string;
  kind: "join" | "leave";
  created_at: string;
};

export async function fetchRoomEvents(roomId: string): Promise<RoomEvent[]> {
  const { data, error } = await supabase
    .from("room_events")
    .select("id, room_id, user_id, kind, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as RoomEvent[];
}

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
    .select(
      "id, name, slug, topic, created_by, created_at, is_direct, direct_key, radio_url, radio_name",
    )
    .single();
  if (error) throw error;
  const join = await supabase.from("room_members").insert({ room_id: data.id, user_id: userId });
  if (join.error) throw join.error;
  return data as Room;
}

export function directKeyFor(a: string, b: string) {
  return [a, b].sort().join(":");
}

/** Finds or creates the 1:1 conversation between two users and returns it. */
export async function openDirectRoom(meId: string, otherId: string): Promise<Room> {
  const key = directKeyFor(meId, otherId);
  const cols = "id, name, slug, topic, created_by, created_at, is_direct, direct_key";

  const existing = await supabase.from("rooms").select(cols).eq("direct_key", key).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    await joinRoom(existing.data.id, meId);
    return existing.data as Room;
  }

  const created = await supabase
    .from("rooms")
    .insert({
      name: "Direct message",
      slug: `dm-${Math.random().toString(36).slice(2, 9)}`,
      topic: null,
      created_by: meId,
      is_direct: true,
      direct_key: key,
    })
    .select(cols)
    .single();

  if (created.error) {
    // Someone created it concurrently — read it back.
    const retry = await supabase.from("rooms").select(cols).eq("direct_key", key).maybeSingle();
    if (retry.data) return retry.data as Room;
    throw created.error;
  }

  const members = await supabase
    .from("room_members")
    .upsert(
      [
        { room_id: created.data.id, user_id: meId },
        { room_id: created.data.id, user_id: otherId },
      ],
      { onConflict: "room_id,user_id" },
    );
  if (members.error) throw members.error;
  return created.data as Room;
}

/** For a direct room, returns the other participant's id. */
export function counterpartId(
  room: Pick<Room, "is_direct" | "direct_key">,
  meId: string,
): string | null {
  if (!room.is_direct || !room.direct_key) return null;
  const ids = room.direct_key.split(":");
  return ids.find((id) => id !== meId) ?? meId;
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

/* ---------- room radio ---------- */

/** Only https stream URLs are accepted (matches the database check). */
export function isValidRadioUrl(url: string) {
  const trimmed = url.trim();
  if (!/^https:\/\/\S+$/i.test(trimmed)) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

export async function setRoomRadio(
  roomId: string,
  radio: { url: string | null; name: string | null },
) {
  const { error } = await supabase
    .from("rooms")
    .update({ radio_url: radio.url, radio_name: radio.name })
    .eq("id", roomId);
  if (error) throw error;
}

/* ---------- room moderation ---------- */

export type RoomAdmin = { room_id: string; user_id: string };

export type Buddy = {
  id: string;
  owner_id: string;
  buddy_id: string;
  nickname: string | null;
  created_at: string;
};

export async function fetchBuddies(ownerId: string): Promise<Buddy[]> {
  const { data, error } = await supabase
    .from("buddies")
    .select("id, owner_id, buddy_id, nickname, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addBuddy(ownerId: string, buddyId: string) {
  const { error } = await supabase
    .from("buddies")
    .insert({ owner_id: ownerId, buddy_id: buddyId });
  if (error && error.code !== "23505") throw error;
}

export async function removeBuddy(ownerId: string, buddyId: string) {
  const { error } = await supabase
    .from("buddies")
    .delete()
    .eq("owner_id", ownerId)
    .eq("buddy_id", buddyId);
  if (error) throw error;
}

export type RoomBan = {
  room_id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  created_at: string;
};

export async function fetchRoomAdmins(roomId: string): Promise<RoomAdmin[]> {
  const { data, error } = await supabase
    .from("room_admins")
    .select("room_id, user_id")
    .eq("room_id", roomId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRoomBans(roomId: string): Promise<RoomBan[]> {
  const { data, error } = await supabase
    .from("room_bans")
    .select("room_id, user_id, banned_by, reason, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addRoomAdmin(roomId: string, userId: string, grantedBy: string) {
  const { error } = await supabase
    .from("room_admins")
    .insert({ room_id: roomId, user_id: userId, granted_by: grantedBy });
  if (error) throw error;
}

export async function removeRoomAdmin(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_admins")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Removes someone from the room without banning them. */
export async function kickMember(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Bans someone from the room and removes them from the roster. */
export async function banMember(
  roomId: string,
  userId: string,
  bannedBy: string,
  reason?: string,
) {
  const { error } = await supabase
    .from("room_bans")
    .insert({ room_id: roomId, user_id: userId, banned_by: bannedBy, reason: reason ?? null });
  if (error) throw error;
  await kickMember(roomId, userId);
}

export async function unbanMember(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_bans")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<Profile, "display_name" | "username" | "status_message" | "avatar_url" | "name_color">
  >,
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
