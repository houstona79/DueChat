import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAIL_DOMAIN } from "@/lib/chat";
import {
  MAILBOX_EMAIL_RE as EMAIL_RE,
  MAILBOX_HANDLE_RE as HANDLE_RE,
  MAILBOX_OWNER_USER_ID as OWNER_USER_ID,
  RESERVED_MAILBOX_HANDLES as RESERVED,
} from "@/lib/workspace-mail-rules";

export type ZohoMailboxRow = {
  address: string;
  status: string;
  provider: string;
  created_at: string;
  last_error: string | null;
};

/** Provider state plus this member's Zoho mailbox (or pending request). */
export const getMyZohoMailbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const zoho = await import("@/lib/zoho-mail.server");
    const google = await import("@/lib/workspace-mail.server");
    const { data, error } = await context.supabase
      .from("member_mailboxes")
      .select("address, status, provider, created_at, last_error")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const row = (data as ZohoMailboxRow | null) ?? null;
    return {
      domain: MAIL_DOMAIN,
      automatic: zoho.isConfigured(),
      googleConfigured: google.isConfigured(),
      webmailUrl: zoho.webmailUrl(),
      mailbox: row && row.provider.startsWith("zoho") ? row : null,
      otherProviderMailbox: row && !row.provider.startsWith("zoho") ? row.address : null,
    };
  });

/**
 * Self-serve claim. With API credentials the mailbox is created at Zoho
 * instantly; without them the request is logged as pending for the owner to
 * create manually in the Zoho Mail admin console.
 */
export const requestZohoMailbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    handle: string;
    firstName?: string | null;
    lastName?: string | null;
    contactEmail?: string | null;
  }) => ({
    handle: input.handle.trim().toLowerCase().slice(0, 24),
    firstName: (input.firstName ?? "").trim().slice(0, 40),
    lastName: (input.lastName ?? "").trim().slice(0, 40),
    contactEmail: input.contactEmail ? input.contactEmail.trim().toLowerCase().slice(0, 200) : null,
  }))
  .handler(async ({ data, context }) => {
    const fail = (message: string) => ({
      ok: false,
      pending: false,
      address: null as string | null,
      password: null as string | null,
      message,
    });

    if (!HANDLE_RE.test(data.handle))
      return fail("Pick 3–24 letters or numbers. Dots, dashes and underscores are allowed in the middle.");
    if (RESERVED.has(data.handle)) return fail("That address is reserved — pick another.");
    if (data.contactEmail && !EMAIL_RE.test(data.contactEmail))
      return fail("That contact email doesn't look right.");

    const existing = await context.supabase
      .from("member_mailboxes")
      .select("address, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      const row = existing.data as { address: string; status: string };
      return fail(
        row.status === "pending"
          ? `Your request for ${row.address} is still waiting on staff.`
          : `You already have ${row.address}.`,
      );
    }

    const taken = await context.supabase
      .from("member_mailboxes")
      .select("address")
      .eq("address", `${data.handle}@${MAIL_DOMAIN}`)
      .maybeSingle();
    if (taken.data) return fail("That address is already claimed.");

    const profile = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const name = ((profile.data as { display_name?: string | null } | null)?.display_name ?? "").trim();
    const [autoFirst, ...autoRest] = name.split(/\s+/).filter(Boolean);
    const firstName = data.firstName || autoFirst || data.handle;
    const lastName = data.lastName || autoRest.join(" ") || "DueChat";

    const address = `${data.handle}@${MAIL_DOMAIN}`;
    const zoho = await import("@/lib/zoho-mail.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!zoho.isConfigured()) {
      const { error } = await supabaseAdmin.from("member_mailboxes").insert({
        user_id: context.userId,
        address,
        provider: "zoho_manual",
        status: "pending",
        last_error: data.contactEmail ? `contact: ${data.contactEmail}` : null,
      });
      if (error) throw error;
      return {
        ok: true,
        pending: true,
        address,
        password: null,
        message: `Request sent — staff will create ${address} in Zoho Mail and send you the sign-in details.`,
      };
    }

    const password = zoho.generatePassword();
    try {
      const res = await zoho.createMailbox({ address, firstName, lastName, password });
      const { error } = await supabaseAdmin.from("member_mailboxes").insert({
        user_id: context.userId,
        address,
        provider: "zoho",
        status: "active",
        provider_user_id: res.id,
      });
      if (error) throw error;
      return {
        ok: true,
        pending: false,
        address,
        password,
        message: `${address} is live at Zoho Mail. Sign in with this one-time password and change it right away.`,
      };
    } catch (err) {
      return fail(
        err instanceof zoho.ZohoMailError
          ? err.message
          : "Couldn't create that mailbox at Zoho right now.",
      );
    }
  });

/** Member-triggered password reset (API path only). */
export const resetMyZohoPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("member_mailboxes")
      .select("address, status, provider")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const row = data as { address: string; status: string; provider: string } | null;
    if (!row || !row.provider.startsWith("zoho"))
      return { ok: false, password: null, message: "You don't have a Zoho mailbox yet." };
    const zoho = await import("@/lib/zoho-mail.server");
    if (!zoho.isConfigured())
      return {
        ok: false,
        password: null,
        message: "Password resets are handled by staff — ask in the Help lobby.",
      };
    if (row.status !== "active")
      return { ok: false, password: null, message: "That mailbox isn't active — contact staff." };
    try {
      const password = zoho.generatePassword();
      await zoho.setPassword(row.address, password);
      return { ok: true, password, message: "New one-time password below — change it after signing in." };
    } catch (err) {
      return {
        ok: false,
        password: null,
        message: err instanceof zoho.ZohoMailError ? err.message : "Couldn't reset that password.",
      };
    }
  });

/** Owner diagnostic for the Zoho Mail connection. */
export const checkZohoMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== OWNER_USER_ID) throw new Error("Forbidden");
    const { checkAccess } = await import("@/lib/zoho-mail.server");
    return checkAccess(MAIL_DOMAIN);
  });

/** Owner-only Zoho mailbox management, including the manual approve/decline flow. */
export const manageZohoMailbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    address: string;
    action: "approve" | "decline" | "suspend" | "restore" | "reset" | "delete";
  }) => ({
    address: input.address.trim().toLowerCase().slice(0, 200),
    action: input.action,
  }))
  .handler(async ({ data, context }) => {
    if (context.userId !== OWNER_USER_ID) throw new Error("Forbidden");
    const zoho = await import("@/lib/zoho-mail.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Manual bookkeeping actions never touch the Zoho API.
    if (data.action === "approve") {
      await supabaseAdmin
        .from("member_mailboxes")
        .update({ status: "active", last_error: null })
        .eq("address", data.address);
      return { ok: true, password: null, message: `${data.address} is marked as created.` };
    }
    if (data.action === "decline") {
      await supabaseAdmin.from("member_mailboxes").delete().eq("address", data.address);
      return { ok: true, password: null, message: `Request for ${data.address} was removed.` };
    }

    if (!zoho.isConfigured()) {
      if (data.action === "delete") {
        await supabaseAdmin.from("member_mailboxes").delete().eq("address", data.address);
        return {
          ok: true,
          password: null,
          message: `Removed ${data.address} here — delete it in the Zoho Mail admin console too.`,
        };
      }
      const status = data.action === "suspend" ? "suspended" : "active";
      await supabaseAdmin
        .from("member_mailboxes")
        .update({ status, last_error: null })
        .eq("address", data.address);
      return {
        ok: true,
        password: null,
        message: `Marked ${data.address} as ${status} here — mirror the change in Zoho Mail.`,
      };
    }

    try {
      if (data.action === "suspend" || data.action === "restore") {
        await zoho.setEnabled(data.address, data.action === "restore");
        await supabaseAdmin
          .from("member_mailboxes")
          .update({ status: data.action === "restore" ? "active" : "suspended", last_error: null })
          .eq("address", data.address);
        return {
          ok: true,
          password: null,
          message: `${data.address} is ${data.action === "restore" ? "active again" : "suspended"}.`,
        };
      }
      if (data.action === "reset") {
        const password = zoho.generatePassword();
        await zoho.setPassword(data.address, password);
        return {
          ok: true,
          password,
          message: `New one-time password for ${data.address}. Share it privately.`,
        };
      }
      await zoho.deleteMailbox(data.address);
      await supabaseAdmin.from("member_mailboxes").delete().eq("address", data.address);
      return { ok: true, password: null, message: `${data.address} was deleted at Zoho.` };
    } catch (err) {
      const message =
        err instanceof zoho.ZohoMailError ? err.message : "Zoho didn't accept that change.";
      await supabaseAdmin
        .from("member_mailboxes")
        .update({ last_error: message })
        .eq("address", data.address);
      return { ok: false, password: null, message };
    }
  });
