import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status_message: string | null;
  name_color: string | null;
  birth_date: string | null;
  country: string | null;
  gender: string | null;
  pronouns: string | null;
  gender_visibility: string;
  pronouns_visibility: string;
  bio: string | null;
  website_url: string | null;
  accepted_eula_at: string | null;
  /** Who may open this profile: everyone, buddies only, or nobody. */
  profile_visibility: string;
  /** Optional badge shown beside the name (diamond, star, flag…). */
  decoration: string | null;
  last_seen_at: string;
  created_at: string;
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
  youtube_url: string | null;
  youtube_title: string | null;
  rating: RoomRating;
  category: string;
  icon_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  website_label: string | null;
  trivia_enabled: boolean;
  /** Staff-only rooms are hidden from regular members by database policy. */
  staff_only: boolean;
  /** Short notice set by the owner or a room super admin. */
  status_message: string | null;
};

export const ROOM_COLS =
  "id, name, slug, topic, created_by, created_at, is_direct, direct_key, radio_url, radio_name, rating, youtube_url, youtube_title, category, icon_url, banner_url, website_url, website_label, trivia_enabled, staff_only, status_message";

const PROFILE_COLS =
  "id, username, display_name, avatar_url, status_message, name_color, birth_date, country, gender, pronouns, gender_visibility, pronouns_visibility, bio, website_url, accepted_eula_at, profile_visibility, decoration, last_seen_at, created_at";

export type RoomBranding = {
  icon_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  website_label: string | null;
};

/** Only https image/site links are accepted (matches the database checks). */
export function isHttpsUrl(url: string) {
  const trimmed = url.trim();
  if (!/^https:\/\/\S{3,500}$/i.test(trimmed)) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

export async function setRoomBranding(roomId: string, branding: RoomBranding) {
  const { data, error } = await supabase
    .from("rooms")
    .update(branding)
    .eq("id", roomId)
    .select("icon_url, banner_url, website_url, website_label")
    .maybeSingle();
  if (!error && data) return data as RoomBranding;
  if (!error) {
    throw new Error("This room could not be updated. Only its owner can change the branding.");
  }
  const raw = `${error.message} ${error.details ?? ""}`;
  if (/rooms_icon_url_https/.test(raw))
    throw new Error("The room icon must be a direct https:// image link (no spaces).");
  if (/rooms_banner_url_https/.test(raw))
    throw new Error("The room banner must be a direct https:// image link (no spaces).");
  if (/rooms_website_url_https/.test(raw))
    throw new Error("The website link must be a full https:// URL with no spaces.");
  if (/rooms_website_label_len/.test(raw))
    throw new Error("The website link text must be 60 characters or fewer.");
  if (/row-level security|permission|policy/i.test(raw))
    throw new Error("Only the room owner or a site admin can change this room's branding.");
  throw new Error(error.message || "Could not save the room branding.");
}

export const ROOM_CATEGORIES = [
  "Help",
  "General",
  "Music",
  "Gaming",
  "Tech",
  "Sports",
  "Movies & TV",
  "Art & Design",
  "Support",
  "Local",
  "Random",
] as const;

export type RoomRating = "G" | "R";

export const ROOM_RATING_LABEL: Record<RoomRating, string> = {
  G: "All ages",
  R: "Adults only",
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
    .select(PROFILE_COLS)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select(
      ROOM_COLS,
    )
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Room[];
}

export type Membership = { room_id: string; user_id: string };

export type RoomEvent = {
  id: string;
  room_id: string;
  user_id: string;
  kind: "join" | "leave" | "bounce";
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

export async function setRoomCategory(roomId: string, category: string) {
  const { error } = await supabase.from("rooms").update({ category }).eq("id", roomId);
  if (error) throw error;
}

export async function createRoom(
  userId: string,
  name: string,
  topic: string,
  category = "General",
) {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ name: name.trim(), slug: slugify(name), topic: topic.trim() || null, created_by: userId, category })
    .select(
      ROOM_COLS,
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
  const cols = ROOM_COLS;

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

export async function setRoomYouTube(
  roomId: string,
  video: { url: string | null; title: string | null },
) {
  const { error } = await supabase
    .from("rooms")
    .update({ youtube_url: video.url, youtube_title: video.title })
    .eq("id", roomId);
  if (error) throw error;
}

/** Returns the embeddable YouTube URL for a watch/share/playlist link, or null. */
export function youtubeEmbedUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let videoId: string | null = null;
  let listId = url.searchParams.get("list");

  if (host === "youtu.be") {
    videoId = url.pathname.slice(1) || null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    else if (url.pathname.startsWith("/embed/")) videoId = url.pathname.slice(7);
    else if (url.pathname.startsWith("/shorts/")) videoId = url.pathname.slice(8);
    else if (url.pathname.startsWith("/live/")) videoId = url.pathname.slice(6);
    else if (url.pathname === "/playlist" && listId) videoId = null;
    else if (!listId) return null;
  } else {
    return null;
  }

  if (videoId && !/^[\w-]{6,20}$/.test(videoId)) return null;
  if (listId && !/^[\w-]{6,50}$/.test(listId)) listId = null;
  if (!videoId && !listId) return null;

  const params = new URLSearchParams({ rel: "0" });
  if (listId) params.set("list", listId);
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
    : `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
}

export async function setRoomRating(roomId: string, rating: RoomRating) {
  const { error } = await supabase.from("rooms").update({ rating }).eq("id", roomId);
  if (error) throw error;
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
    Pick<
      Profile,
      | "display_name"
      | "username"
      | "status_message"
      | "avatar_url"
      | "name_color"
      | "birth_date"
      | "country"
      | "gender"
      | "pronouns"
      | "gender_visibility"
      | "pronouns_visibility"
      | "bio"
      | "website_url"
      | "accepted_eula_at"
    >
  >,
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function acceptEula(userId: string) {
  await updateProfile(userId, { accepted_eula_at: new Date().toISOString() });
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

/** Age in whole years from an ISO date string, or null when unknown. */
export function ageFromBirthDate(birthDate: string | null | undefined) {
  if (!birthDate) return null;
  const dob = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** R-rated rooms are adults only (18+). */
export function isAdultProfile(profile: Pick<Profile, "birth_date"> | null | undefined) {
  const age = ageFromBirthDate(profile?.birth_date);
  return age !== null && age >= 18;
}

/**
 * Normalize a user-entered profile link to a safe https URL.
 * Returns null when empty or not a usable http(s) link.
 */
export function normalizeWebsiteUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.protocol = "https:";
    const normalized = url.toString();
    return normalized.length <= 300 ? normalized : null;
  } catch {
    return null;
  }
}
