import { supabase } from "@/integrations/supabase/client";

export type SupportLog = {
  id: string;
  ticket_id: string | null;
  subject: string | null;
  guest_name: string | null;
  guest_email: string | null;
  member_name: string | null;
  from_staff: boolean;
  body: string;
  sent_at: string;
  archived_at: string;
};

/** Newest archived support lines, most recent first. Admin only (RLS). */
export async function fetchSupportLogs(limit = 500): Promise<SupportLog[]> {
  const { data, error } = await supabase
    .from("support_logs")
    .select(
      "id, ticket_id, subject, guest_name, guest_email, member_name, from_staff, body, sent_at, archived_at",
    )
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SupportLog[];
}

/** Group archived support lines by the night they were archived, then by ticket. */
export function groupSupportLogs(logs: SupportLog[]) {
  const nights = new Map<string, Map<string, SupportLog[]>>();
  for (const log of logs) {
    const night = log.archived_at.slice(0, 10);
    const who = log.member_name ?? log.guest_name ?? log.guest_email ?? "Guest";
    const label = `${log.subject ?? "Support request"} — ${who}`;
    if (!nights.has(night)) nights.set(night, new Map());
    const tickets = nights.get(night)!;
    if (!tickets.has(label)) tickets.set(label, []);
    tickets.get(label)!.push(log);
  }
  return [...nights.entries()].map(([night, tickets]) => ({
    night,
    tickets: [...tickets.entries()].map(([ticket, entries]) => ({
      ticket,
      entries: [...entries].reverse(),
    })),
  }));
}

/** Plain-text export of one archived night for record keeping. */
export function supportLogsToText(logs: SupportLog[]) {
  return logs
    .map(
      (l) =>
        `[${new Date(l.sent_at).toISOString()}] (${l.subject ?? "Support request"}) ${
          l.from_staff ? "Staff" : (l.member_name ?? l.guest_name ?? l.guest_email ?? "Guest")
        }: ${l.body}`,
    )
    .join("\n");
}
