import { supabase } from "@/integrations/supabase/client";
import { youtubeEmbedUrl } from "@/lib/chat";

export type KaraokeSong = {
  id: string;
  room_id: string;
  user_id: string;
  title: string;
  artist: string | null;
  youtube_url: string;
  singer_name: string | null;
  played_at: string | null;
  created_at: string;
};

const COLS =
  "id, room_id, user_id, title, artist, youtube_url, singer_name, played_at, created_at";

export async function fetchKaraokeQueue(roomId: string): Promise<KaraokeSong[]> {
  const { data, error } = await supabase
    .from("karaoke_queue")
    .select(COLS)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addKaraokeSong(input: {
  roomId: string;
  userId: string;
  title: string;
  artist?: string | null;
  youtubeUrl: string;
  singerName?: string | null;
}) {
  const url = input.youtubeUrl.trim();
  if (!youtubeEmbedUrl(url)) {
    throw new Error("Paste a YouTube karaoke link (watch, Shorts, live or playlist).");
  }
  const title = input.title.trim().slice(0, 120);
  if (!title) throw new Error("Give the song a title.");
  const { error } = await supabase.from("karaoke_queue").insert({
    room_id: input.roomId,
    user_id: input.userId,
    title,
    artist: input.artist?.trim().slice(0, 80) || null,
    youtube_url: url,
    singer_name: input.singerName?.trim().slice(0, 60) || null,
  });
  if (error) throw error;
}

export async function removeKaraokeSong(id: string) {
  const { error } = await supabase.from("karaoke_queue").delete().eq("id", id);
  if (error) throw error;
}

/** Marks a queued song as sung so it drops to the "already sung" list. */
export async function markKaraokeSongPlayed(id: string) {
  const { error } = await supabase
    .from("karaoke_queue")
    .update({ played_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function requeueKaraokeSong(id: string) {
  const { error } = await supabase.from("karaoke_queue").update({ played_at: null }).eq("id", id);
  if (error) throw error;
}

/** Popular karaoke picks — opens a YouTube karaoke search so singers grab a track link. */
export const KARAOKE_PICKS = [
  { title: "Don't Stop Believin'", artist: "Journey" },
  { title: "Sweet Caroline", artist: "Neil Diamond" },
  { title: "I Will Survive", artist: "Gloria Gaynor" },
  { title: "Bohemian Rhapsody", artist: "Queen" },
  { title: "Wannabe", artist: "Spice Girls" },
  { title: "Shallow", antml: false, artistName: "" , artist: "Lady Gaga & Bradley Cooper" },
  { title: "Before He Cheats", artist: "Carrie Underwood" },
  { title: "Livin' on a Prayer", artist: "Bon Jovi" },
  { title: "Someone Like You", artist: "Adele" },
  { title: "國Africa", artist: "Toto" },
  { title: "Total Eclipse of the Heart", artist: "Bonnie Tyler" },
  { title: "Jolene", artist: "Dolly Parton" },
] as const;

export function karaokeSearchUrl(title: string, artist?: string | null) {
  const q = `${title} ${artist ?? ""} karaoke`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
