import { supabase } from "@/integrations/supabase/client";
import { MAIL_DOMAIN } from "@/lib/chat";

export type MailMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  read_at: string | null;
  sender_deleted: boolean;
  recipient_deleted: boolean;
  created_at: string;
};

export type MailPerson = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  mail_handle: string | null;
};

const COLS =
  "id, sender_id, recipient_id, subject, body, read_at, sender_deleted, recipient_deleted, created_at";

/** In-app address shown for a member, e.g. amanda@comtv.us. */
export function mailAddress(person: Pick<MailPerson, "username" | "mail_handle"> | null) {
  const handle = person?.mail_handle ?? person?.username ?? null;
  return handle ? `${handle}@${MAIL_DOMAIN}` : null;
}

export async function fetchInbox(userId: string): Promise<MailMessage[]> {
  const { data, error } = await supabase
    .from("mail_messages")
    .select(COLS)
    .eq("recipient_id", userId)
    .eq("recipient_deleted", false)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as MailMessage[];
}

export async function fetchSent(userId: string): Promise<MailMessage[]> {
  const { data, error } = await supabase
    .from("mail_messages")
    .select(COLS)
    .eq("sender_id", userId)
    .eq("sender_deleted", false)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as MailMessage[];
}

export async function fetchMailPeople(ids: string[]): Promise<Record<string, MailPerson>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, mail_handle")
    .in("id", unique);
  if (error) throw error;
  const map: Record<string, MailPerson> = {};
  for (const row of (data ?? []) as MailPerson[]) map[row.id] = row;
  return map;
}

/** Accepts a username, a mail handle, or a full name@comtv.us address. */
export async function findRecipient(raw: string): Promise<MailPerson | null> {
  const value = raw.trim().toLowerCase().replace(new RegExp(`@${MAIL_DOMAIN}$`), "").replace(/^@/, "");
  if (!value) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, mail_handle")
    .or(`username.eq.${value},mail_handle.eq.${value}`)
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as MailPerson | undefined) ?? null;
}

export async function sendMail(input: { to: string; subject: string; body: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const person = await findRecipient(input.to);
  if (!person) throw new Error("No DueChat member has that address.");
  if (person.id === auth.user.id) throw new Error("You can't mail yourself.");
  const { error } = await supabase.from("mail_messages").insert({
    sender_id: auth.user.id,
    recipient_id: person.id,
    subject: input.subject.trim().slice(0, 140),
    body: input.body.trim(),
  });
  if (error) throw error;
  return person;
}

export async function markMailRead(id: string) {
  const { error } = await supabase
    .from("mail_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

export async function deleteMail(id: string, side: "inbox" | "sent") {
  const patch = side === "inbox" ? { recipient_deleted: true } : { sender_deleted: true };
  const { error } = await supabase.from("mail_messages").update(patch).eq("id", id);
  if (error) throw error;
}

export async function countUnreadMail(userId: string) {
  const { count, error } = await supabase
    .from("mail_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("recipient_deleted", false)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}
