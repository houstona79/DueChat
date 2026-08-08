import { supabase } from "@/integrations/supabase/client";

export type MessageLog = {
  id: string;
  room_id: string | null;
  room_name: string | null;
  room_slug: string | null;
  is_direct: boolean;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  body: string;
  sent_at: string;
  archived_at: string;
};

/** Newest archived chat lines, most recent first. */
export async function fetchMessageLogs(limit = 500): Promise<MessageLog[]> {
  const { data, error } = await supabase
    .from("message_logs")
    .select(
      "id, room_id, room_name, room_slug, is_direct, user_id, username, display_name, body, sent_at, archived_at",
    )
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MessageLog[];
}

/** Group archived lines by the night they were archived, then by room. */
export function groupLogs(logs: MessageLog[]) {
  const nights = new Map<string, Map<string, MessageLog[]>>();
  for (const log of logs) {
    const night = log.archived_at.slice(0, 10);
    const room = log.room_name ?? (log.is_direct ? "Direct message" : "Deleted room");
    if (!nights.has(night)) nights.set(night, new Map());
    const rooms = nights.get(night)!;
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(log);
  }
  return [...nights.entries()].map(([night, rooms]) => ({
    night,
    rooms: [...rooms.entries()].map(([room, entries]) => ({
      room,
      entries: [...entries].reverse(),
    })),
  }));
}

/** Plain-text export of an archived night for record keeping. */
export function logsToText(logs: MessageLog[]) {
  return logs
    .map(
      (l) =>
        `[${new Date(l.sent_at).toISOString()}] (${l.room_name ?? "unknown room"}) ${
          l.display_name ?? l.username ?? "unknown"
        }: ${l.body}`,
    )
    .join("\n");
}
