import { supabase } from "@/integrations/supabase/client";
import type { SupportMessage, SupportThread, SupportTicket } from "@/lib/support-types";

/** The signed-in member's most recent support chat, if any. */
export async function fetchMyTicket(): Promise<SupportThread | null> {
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, subject, status")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ticket) return null;
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status as SupportThread["status"],
    messages: await fetchTicketMessages(ticket.id),
  };
}

export async function fetchTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  const { data: messages } = await supabase
    .from("support_messages")
    .select("id, body, from_staff, created_at, sender_id")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(300);

  const rows = messages ?? [];
  const senderIds = [...new Set(rows.map((m) => m.sender_id).filter((id): id is string => Boolean(id)))];

  const profiles: Record<string, { display_name: string; username: string }> = {};
  if (senderIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", senderIds);
    for (const p of profileRows ?? []) {
      profiles[p.id] = p;
    }
  }

  const hasGuest = rows.some((m) => !m.from_staff && !m.sender_id);
  let guestName: string | null = null;
  if (hasGuest) {
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("guest_name")
      .eq("id", ticketId)
      .maybeSingle();
    guestName = ticket?.guest_name ?? null;
  }

  return rows.map((m) => {
    const profile = m.sender_id ? profiles[m.sender_id] : null;
    const senderName = m.from_staff
      ? profile?.display_name || profile?.username || "DueChat support"
      : m.sender_id
        ? profile?.display_name || profile?.username || "Member"
        : guestName || "Guest";
    return {
      id: m.id,
      body: m.body,
      from_staff: m.from_staff,
      created_at: m.created_at,
      sender_id: m.sender_id,
      sender_name: senderName,
    };
  });
}

/** Opens a support chat as the signed-in member. */
export async function startMyTicket(subject: string, body: string): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Please sign in again.");

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: userId, subject: subject.trim().slice(0, 140) })
    .select("id")
    .single();
  if (error || !ticket) throw new Error(error?.message ?? "Could not start the chat.");

  await sendMyMessage(ticket.id, body);
  return ticket.id;
}

export async function sendMyMessage(ticketId: string, body: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Please sign in again.");
  const { error } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: userId,
    from_staff: false,
    body: body.trim().slice(0, 2000),
  });
  if (error) throw new Error(error.message);
}

/* ---------------- admin side ---------------- */

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, user_id, guest_name, guest_email, subject, status, last_message_at, created_at")
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SupportTicket[];

  const memberIds = [
    ...new Set(rows.map((t) => t.user_id).filter((id): id is string => Boolean(id))),
  ];
  if (memberIds.length === 0) return rows;

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", memberIds);
  const names: Record<string, string> = {};
  for (const p of profileRows ?? []) {
    names[p.id] = p.display_name || p.username;
  }
  return rows.map((t) => ({
    ...t,
    member_name: t.user_id ? (names[t.user_id] ?? null) : null,
  }));
}

export async function sendStaffMessage(ticketId: string, body: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Please sign in again.");
  const { error } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: userId,
    from_staff: true,
    body: body.trim().slice(0, 2000),
  });
  if (error) throw new Error(error.message);
}

export async function setTicketStatus(ticketId: string, status: "open" | "closed") {
  const { error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);
}