import { createServerFn } from "@tanstack/react-start";
import { guestHandleSchema, guestReplySchema, guestStartSchema } from "@/lib/support-schemas";
import type { SupportThread } from "@/lib/support-types";

/** Opens a support chat for a visitor who isn't signed in. */
export const startGuestTicket = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guestStartSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        guest_name: data.name,
        guest_email: data.email.toLowerCase(),
        subject: data.subject,
      })
      .select("id, guest_token")
      .single();
    if (error || !ticket) throw new Error("Could not start the support chat.");

    const { error: msgError } = await supabaseAdmin
      .from("support_messages")
      .insert({ ticket_id: ticket.id, body: data.body, from_staff: false });
    if (msgError) throw new Error("Could not send your first message.");

    return { id: ticket.id, token: ticket.guest_token as string };
  });

/** Reads a guest's own chat using the private token issued when it opened. */
export const guestTicketThread = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guestHandleSchema.parse(input))
  .handler(async ({ data }): Promise<SupportThread | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("id, subject, status")
      .eq("id", data.id)
      .eq("guest_token", data.token)
      .maybeSingle();
    if (!ticket) return null;

    const { data: messages } = await supabaseAdmin
      .from("support_messages")
      .select("id, body, from_staff, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true })
      .limit(300);

    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status as SupportThread["status"],
      messages: messages ?? [],
    };
  });

/** Adds a guest reply to their existing chat. */
export const sendGuestMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guestReplySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("id")
      .eq("id", data.id)
      .eq("guest_token", data.token)
      .maybeSingle();
    if (!ticket) throw new Error("This support chat is no longer available.");

    const { count } = await supabaseAdmin
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("ticket_id", ticket.id);
    if ((count ?? 0) >= 300) throw new Error("This chat has reached its message limit.");

    const { error } = await supabaseAdmin
      .from("support_messages")
      .insert({ ticket_id: ticket.id, body: data.body, from_staff: false });
    if (error) throw new Error("Could not send your message.");

    return { ok: true };
  });