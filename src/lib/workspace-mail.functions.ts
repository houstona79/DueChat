import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAIL_DOMAIN } from "@/lib/chat";

const OWNER_USER_ID = "9ab27da1-753c-4fba-bf47-6932ab7de55c";
const HANDLE_RE = /^[a-z0-9]([a-z0-9._-]{1,22})[a-z0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESERVED = new Set([
  "admin","administrator","postmaster","abuse","support","help","root","info",
  "noreply","no-reply","notify","mail","webmaster","security","billing","staff",
  "duechat","owner","moderator",
]);

export type MailboxRow = {
  address: string;
  status: string;
  provider: string;
  created_at: string;
  last_error: string | null;
};

/** What the member (or staff) needs to render the mailbox card. */
export const getMyMailbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isConfigured, getMailbox } = await import("@/lib/workspace-mail.server");
    const { data, error } = await context.supabase
      .from("member_mailboxes")
      .select("address, status, provider, created_at, last_error")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const row = (data as MailboxRow | null) ?? null;
    let live: { suspended: boolean; lastLoginTime: string | null } | null = null;
    if (row && isConfigured()) {
      try {
        const remote = await getMailbox(row.address);
        live = remote
          ? { suspended: remote.suspended, lastLoginTime: remote.lastLoginTime ?? null }
          : null;
      } catch {
        live = null;
      }
    }
    return {
      configured: isConfigured(),
      domain: MAIL_DOMAIN,
      mailbox: row,
      live,
      webmailUrl: "https://mail.google.com/a/" + MAIL_DOMAIN,
    };
  });

/** Instant self-serve: creates the member's real Google Workspace mailbox. */
export const createMyMailbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    handle: string;
    firstName?: string | null;
    lastName?: string | null;
    recoveryEmail?: string | null;
  }) => ({
    handle: input.handle.trim().toLowerCase().slice(0, 24),
    firstName: (input.firstName ?? "").trim().slice(0, 40),
    lastName: (input.lastName ?? "").trim().slice(0, 40),
    recoveryEmail: input.recoveryEmail ? input.recoveryEmail.trim().toLowerCase().slice(0, 200) : null,
  }))
  .handler(async ({ data, context }) => {
    const fail = (message: string) => ({ created: false, address: null, password: null, message });

    if (!HANDLE_RE.test(data.handle))
      return fail("Pick 3–24 letters or numbers. Dots, dashes and underscores are allowed in the middle.");
    if (RESERVED.has(data.handle)) return fail("That address is reserved — pick another.");
    if (data.recoveryEmail && !EMAIL_RE.test(data.recoveryEmail))
      return fail("That recovery email doesn't look right.");

    const mod = await import("@/lib/workspace-mail.server");
    if (!mod.isConfigured())
      return fail("Mailboxes aren't switched on yet — the site owner still has to connect Google Workspace.");

    const existing = await context.supabase
      .from("member_mailboxes")
      .select("address, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data)
      return fail(`You already have ${(existing.data as { address: string }).address}.`);

    const profile = await context.supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", context.userId)
      .maybeSingle();
    const name = ((profile.data as { display_name?: string | null } | null)?.display_name ?? "")
      .trim();
    const [autoFirst, ...autoRest] = name.split(/\s+/).filter(Boolean);
    const givenName = data.firstName || autoFirst || data.handle;
    const familyName = data.lastName || autoRest.join(" ") || "DueChat";

    const address = `${data.handle}@${MAIL_DOMAIN}`;
    const password = mod.generatePassword();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const res = await mod.createMailbox({
        address,
        givenName,
        familyName,
        password,
        recoveryEmail: data.recoveryEmail,
      });
      const { error } = await supabaseAdmin.from("member_mailboxes").insert({
        user_id: context.userId,
        address,
        provider: "google_workspace",
        status: "active",
        provider_user_id: res.id,
      });
      if (error) throw error;
      return {
        created: true,
        address,
        password,
        message: `${address} is live. Sign in at Gmail with this one-time password — you'll be asked to set your own.`,
      };
    } catch (err) {
      const message =
        err instanceof mod.MailboxError
          ? err.message
          : "Couldn't create that mailbox right now. Try again in a minute.";
      return fail(message);
    }
  });

/** Member-triggered password reset: issues a fresh one-time password. */
export const resetMyMailboxPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("member_mailboxes")
      .select("address, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const row = data as { address: string; status: string } | null;
    if (!row) return { ok: false, password: null, message: "You don't have a mailbox yet." };
    if (row.status !== "active")
      return { ok: false, password: null, message: "That mailbox is suspended — contact staff." };
    const mod = await import("@/lib/workspace-mail.server");
    try {
      const password = mod.generatePassword();
      await mod.setPassword(row.address, password);
      return {
        ok: true,
        password,
        message: "New one-time password below — you'll be asked to change it when you sign in.",
      };
    } catch (err) {
      return {
        ok: false,
        password: null,
        message:
          err instanceof mod.MailboxError ? err.message : "Couldn't reset that password right now.",
      };
    }
  });

/** Owner diagnostic for the Google Workspace connection. */
export const checkWorkspaceMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== OWNER_USER_ID) throw new Error("Forbidden");
    const { checkAccess } = await import("@/lib/workspace-mail.server");
    return checkAccess(MAIL_DOMAIN);
  });

/** Owner-only mailbox management: suspend, restore, reset or delete. */
export const manageMemberMailbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { address: string; action: "suspend" | "restore" | "reset" | "delete" }) => ({
    address: input.address.trim().toLowerCase().slice(0, 200),
    action: input.action,
  }))
  .handler(async ({ data, context }) => {
    if (context.userId !== OWNER_USER_ID) throw new Error("Forbidden");
    const mod = await import("@/lib/workspace-mail.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      if (data.action === "suspend") {
        await mod.setSuspended(data.address, true);
        await supabaseAdmin
          .from("member_mailboxes")
          .update({ status: "suspended", last_error: null })
          .eq("address", data.address);
        return { ok: true, password: null, message: `${data.address} is suspended.` };
      }
      if (data.action === "restore") {
        await mod.setSuspended(data.address, false);
        await supabaseAdmin
          .from("member_mailboxes")
          .update({ status: "active", last_error: null })
          .eq("address", data.address);
        return { ok: true, password: null, message: `${data.address} is active again.` };
      }
      if (data.action === "reset") {
        const password = mod.generatePassword();
        await mod.setPassword(data.address, password);
        return {
          ok: true,
          password,
          message: `New one-time password for ${data.address}. Share it privately.`,
        };
      }
      await mod.deleteMailbox(data.address);
      await supabaseAdmin.from("member_mailboxes").delete().eq("address", data.address);
      return { ok: true, password: null, message: `${data.address} was deleted at Google.` };
    } catch (err) {
      const message =
        err instanceof mod.MailboxError ? err.message : "Google didn't accept that change.";
      await supabaseAdmin
        .from("member_mailboxes")
        .update({ last_error: message })
        .eq("address", data.address);
      return { ok: false, password: null, message };
    }
  });
