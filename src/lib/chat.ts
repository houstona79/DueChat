import { supabase } from "@/integrations/supabase/client";

/** Domain used for member mail handles (forwarding is configured at the DNS provider). */
export const MAIL_DOMAIN = "comtv.us";

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
  /** Claimed @comtv.us mail handle (local part only), or null. */
  mail_handle: string | null;
  /** The member's own external inbox their handle forwards to, or null. */
  mail_forward_to?: string | null;
  /** True once Cloudflare has confirmed that inbox. */
  mail_forward_verified?: boolean;
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
  /** One or two lines about the room, shown on browse cards. */
  description: string | null;
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
  /** Hidden rooms never appear in the room list for non-members. */
  invisible: boolean;
  /** Locked rooms are listed but need an entry code to get in. */
  locked: boolean;
  /** Optional hex color for the room name, chosen by the owner. */
  name_color: string | null;
};

export const ROOM_COLS =
  "id, name, slug, topic, description, created_by, created_at, is_direct, direct_key, radio_url, radio_name, rating, youtube_url, youtube_title, category, icon_url, banner_url, website_url, website_label, trivia_enabled, staff_only, status_message, invisible, locked, name_color";

/** The 25 room-name colors owners can pick from. */
export const ROOM_NAME_COLORS: { hex: string; label: string }[] = [
  { hex: "#EF4444", label: "Red" },
  { hex: "#F97316", label: "Orange" },
  { hex: "#F59E0B", label: "Amber" },
  { hex: "#EAB308", label: "Gold" },
  { hex: "#84CC16", label: "Lime" },
  { hex: "#22C55E", label: "Green" },
  { hex: "#10B981", label: "Emerald" },
  { hex: "#14B8A6", label: "Teal" },
  { hex: "#06B6D4", label: "Cyan" },
  { hex: "#0EA5E9", label: "Sky" },
  { hex: "#3B82F6", label: "Blue" },
  { hex: "#1D4ED8", label: "Dark blue" },
  { hex: "#6366F1", label: "Indigo" },
  { hex: "#8B5CF6", label: "Violet" },
  { hex: "#4C1D95", label: "Midnight violet" },
  { hex: "#A855F7", label: "Purple" },
  { hex: "#D946EF", label: "Fuchsia" },
  { hex: "#EC4899", label: "Pink" },
  { hex: "#FF69B4", label: "Hot pink" },
  { hex: "#F43F5E", label: "Rose" },
  { hex: "#800000", label: "Maroon" },
  { hex: "#B45309", label: "Bronze" },
  { hex: "#78716C", label: "Stone" },
  { hex: "#C0C0C0", label: "Silver" },
  { hex: "#F0FFF0", label: "Honeydew" },
];

export type RoomSettings = {
  name: string;
  topic: string | null;
  description: string | null;
  category: string;
  rating: RoomRating;
  status_message: string | null;
  invisible: boolean;
  name_color: string | null;
};

/** Saves the owner-editable room details in one update. */
export async function updateRoomSettings(roomId: string, settings: RoomSettings) {
  const { data, error } = await supabase
    .from("rooms")
    .update(settings)
    .eq("id", roomId)
    .select("id")
    .maybeSingle();
  if (error) {
    const raw = `${error.message} ${error.details ?? ""}`;
    if (/rooms_name_color_hex/.test(raw)) throw new Error("Pick a color from the palette.");
    if (/row-level security|permission|policy/i.test(raw))
      throw new Error("Only the room owner or a site admin can edit this room.");
    throw new Error(error.message || "Could not save the room.");
  }
  if (!data) throw new Error("Only the room owner or a site admin can edit this room.");
}

const PROFILE_COLS =
  "id, username, display_name, avatar_url, status_message, name_color, birth_date, country, gender, pronouns, gender_visibility, pronouns_visibility, bio, website_url, mail_handle, accepted_eula_at, profile_visibility, decoration, last_seen_at, created_at";

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
  "Karaoke",
  "Radio",
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
  is_bold: boolean;
  is_italic: boolean;
  is_underlined: boolean;
  font_size: number;
};

export type MessageTextStyle = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  size: number;
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
    .select(ROOM_COLS)
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
    .select(
      "id, room_id, user_id, body, created_at, is_bold, is_italic, is_underlined, font_size",
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  roomId: string,
  userId: string,
  body: string,
  textStyle?: MessageTextStyle,
) {
  const size = Math.min(4, Math.max(1, Math.round(textStyle?.size ?? 1)));
  const { error } = await supabase.from("messages").insert({
    room_id: roomId,
    user_id: userId,
    body,
    is_bold: textStyle?.bold ?? false,
    is_italic: textStyle?.italic ?? false,
    is_underlined: textStyle?.underline ?? false,
    font_size: size,
  });
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
  options: { invisible?: boolean; lockCode?: string | null; description?: string | null } = {},
) {
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      name: name.trim(),
      slug: slugify(name),
      topic: topic.trim() || null,
      description: options.description?.trim() || null,
      created_by: userId,
      category,
      invisible: options.invisible ?? false,
    })
    .select(ROOM_COLS)
    .single();
  if (error) throw error;
  const join = await supabase.from("room_members").insert({ room_id: data.id, user_id: userId });
  if (join.error) throw join.error;
  const code = options.lockCode?.trim();
  if (code) {
    await setRoomLock(data.id, code);
    return { ...(data as Room), locked: true };
  }
  return data as Room;
}

/** Sets (or clears, with null) a room's entry code. Owner / super admin only. */
export async function setRoomLock(roomId: string, code: string | null) {
  const { error } = await supabase.rpc("set_room_lock", { _room_id: roomId, _code: code ?? "" });
  if (error) throw new Error(error.message || "Could not save the entry code.");
}

/** Checks the entry code and joins the room. Returns false when the code is wrong. */
export async function unlockRoom(roomId: string, code: string) {
  const { data, error } = await supabase.rpc("unlock_room", { _room_id: roomId, _code: code });
  if (error) throw new Error(error.message || "Could not enter this room.");
  return data === true;
}

/** Hides a room from the room list, or shows it again. */
export async function setRoomInvisible(roomId: string, invisible: boolean) {
  const { error } = await supabase.from("rooms").update({ invisible }).eq("id", roomId);
  if (error) throw error;
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

  const members = await supabase.from("room_members").upsert(
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
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);
}

/* ---------- room radio ---------- */

/**
 * Clean up a pasted station link: strip stray whitespace/newlines and quotes,
 * turn `spotify:playlist:ID` URIs into web links, and upgrade http:// to https://
 * (the database only accepts https).
 */
export function normalizeRadioInput(raw: string) {
  let value = raw.replace(/[\s\u00a0]+/g, " ").trim().replace(/^["'<]+|["'>]+$/g, "");
  const uri = /^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/i.exec(value);
  if (uri) return `https://open.spotify.com/${(uri[1] ?? "").toLowerCase()}/${uri[2] ?? ""}`;
  if (/^http:\/\//i.test(value)) value = `https://${value.slice(7)}`;
  if (/^(open\.spotify\.com|www\.)/i.test(value)) value = `https://${value}`;
  return value;
}

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

/**
 * Spotify playlists/albums/artists/shows can be used as a room "station".
 * They can't stream through <audio>, so we render Spotify's own embed player.
 * Returns the embed URL, or null when the link isn't a supported Spotify link.
 */
export function spotifyEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (!/(^|\.)spotify\.com$/i.test(parsed.hostname)) return null;
    const match = /^\/(?:intl-[a-z-]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/.exec(
      parsed.pathname,
    );
    if (!match) return null;
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=duechat`;
  } catch {
    return null;
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

/** Room admin tiers: super admins manage the room, admins moderate people. */
export type RoomAdminTier = "super" | "admin";

export type RoomAdmin = { room_id: string; user_id: string; tier: RoomAdminTier };

export const ROOM_ADMIN_TIER_LABEL: Record<RoomAdminTier, string> = {
  super: "Super admin",
  admin: "Room admin",
};

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
  const { error } = await supabase.from("buddies").insert({ owner_id: ownerId, buddy_id: buddyId });
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
  /** null means the restriction never expires. */
  expires_at: string | null;
};

export type RoomSilence = {
  room_id: string;
  user_id: string;
  silenced_by: string;
  reason: string | null;
  created_at: string;
  expires_at: string | null;
};

/** Ban / silence lengths offered in the room panels. */
export const MODERATION_DURATIONS = [
  { value: "60", label: "1 hour" },
  { value: "360", label: "6 hours" },
  { value: "1440", label: "1 day" },
  { value: "10080", label: "1 week" },
  { value: "0", label: "Until removed" },
] as const;

export function expiryFromMinutes(minutes: number): string | null {
  return minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
}

/** A ban/silence row still in force right now. */
export function isActive(row: { expires_at: string | null }) {
  return !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
}

export async function fetchRoomAdmins(roomId: string): Promise<RoomAdmin[]> {
  const { data, error } = await supabase
    .from("room_admins")
    .select("room_id, user_id, tier")
    .eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as RoomAdmin[];
}

export async function fetchRoomBans(roomId: string): Promise<RoomBan[]> {
  const { data, error } = await supabase
    .from("room_bans")
    .select("room_id, user_id, banned_by, reason, created_at, expires_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRoomSilences(roomId: string): Promise<RoomSilence[]> {
  const { data, error } = await supabase
    .from("room_silences")
    .select("room_id, user_id, silenced_by, reason, created_at, expires_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Silences ("dots") someone so they can read the room but not post. */
export async function silenceMember(
  roomId: string,
  userId: string,
  silencedBy: string,
  expiresAt: string | null,
) {
  const { error } = await supabase
    .from("room_silences")
    .upsert(
      { room_id: roomId, user_id: userId, silenced_by: silencedBy, expires_at: expiresAt },
      { onConflict: "room_id,user_id" },
    );
  if (error) throw error;
}

export async function unsilenceMember(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_silences")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Owner/super-admin only: the notice shown under the room name. */
export async function setRoomStatusMessage(roomId: string, status: string | null) {
  const { error } = await supabase
    .from("rooms")
    .update({ status_message: status })
    .eq("id", roomId);
  if (error) throw error;
}

export async function addRoomAdmin(
  roomId: string,
  userId: string,
  grantedBy: string,
  tier: RoomAdminTier = "admin",
) {
  const { error } = await supabase
    .from("room_admins")
    .upsert(
      { room_id: roomId, user_id: userId, granted_by: grantedBy, tier },
      { onConflict: "room_id,user_id" },
    );
  if (error) throw error;
}

export async function setRoomAdminTier(roomId: string, userId: string, tier: RoomAdminTier) {
  const { error } = await supabase
    .from("room_admins")
    .update({ tier })
    .eq("room_id", roomId)
    .eq("user_id", userId);
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

/**
 * Restricts someone from the room and removes them from the roster.
 * `expiresAt` null keeps them out until they are removed from the list.
 */
export async function banMember(
  roomId: string,
  userId: string,
  bannedBy: string,
  reason?: string,
  expiresAt: string | null = null,
) {
  const { error } = await supabase.from("room_bans").upsert(
    {
      room_id: roomId,
      user_id: userId,
      banned_by: bannedBy,
      reason: reason ?? null,
      expires_at: expiresAt,
    },
    { onConflict: "room_id,user_id" },
  );
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
      | "mail_handle"
      | "accepted_eula_at"
      | "profile_visibility"
      | "decoration"
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
  // Google/OAuth avatars are already absolute URLs — never send them to storage signing.
  if (/^https?:\/\//i.test(path)) return path;
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
