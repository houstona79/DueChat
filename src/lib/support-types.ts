/** Shared shapes for the live support system (safe to import anywhere). */

export type SupportStatus = "open" | "closed";

export type SupportMessage = {
  id: string;
  body: string;
  from_staff: boolean;
  created_at: string;
};

export type SupportThread = {
  id: string;
  subject: string;
  status: SupportStatus;
  messages: SupportMessage[];
};

export type SupportTicket = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  subject: string;
  status: SupportStatus;
  last_message_at: string;
  created_at: string;
};

/** Local handle a guest keeps so they can reopen their own chat later. */
export const GUEST_TICKET_KEY = "duechat.support-ticket";

export type GuestHandle = { id: string; token: string };

export function readGuestHandle(): GuestHandle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_TICKET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestHandle;
    return parsed?.id && parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

export function writeGuestHandle(handle: GuestHandle | null) {
  if (typeof window === "undefined") return;
  try {
    if (handle) window.localStorage.setItem(GUEST_TICKET_KEY, JSON.stringify(handle));
    else window.localStorage.removeItem(GUEST_TICKET_KEY);
  } catch {
    /* private browsing */
  }
}