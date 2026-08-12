import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAIL_DOMAIN } from "@/lib/chat";

export const syncMyMailRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("mail_handle, mail_forward_to")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const { syncCloudflareRoute } = await import("@/lib/mail-routing.server");
    return syncCloudflareRoute({
      userId: context.userId,
      handle: (data?.mail_handle as string | null) ?? null,
      forwardTo: (data?.mail_forward_to as string | null) ?? null,
      domain: MAIL_DOMAIN,
    });
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Saves the member's own inbox and asks Cloudflare to send it a confirmation email. */
export const setMyMailForward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string | null }) => ({
    email: input.email ? input.email.trim().toLowerCase().slice(0, 200) : null,
  }))
  .handler(async ({ data, context }) => {
    if (data.email && !EMAIL_RE.test(data.email))
      return { saved: false, verified: false, message: "That email address doesn't look right." };

    const existing = await context.supabase
      .from("profiles")
      .select("mail_handle")
      .eq("id", context.userId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    const handle = (existing.data?.mail_handle as string | null) ?? null;

    const { error } = await context.supabase
      .from("profiles")
      .update({ mail_forward_to: data.email, mail_forward_verified: false })
      .eq("id", context.userId);
    if (error) throw error;

    const mod = await import("@/lib/mail-routing.server");
    if (!data.email) {
      const cleared = await mod.syncCloudflareRoute({
        userId: context.userId,
        handle,
        forwardTo: null,
        domain: MAIL_DOMAIN,
      });
      return {
        saved: true,
        verified: false,
        message: cleared.synced
          ? "Personal forwarding removed — your handle goes back to the shared DueChat inbox."
          : (cleared.message ?? "Saved."),
        };
    }

    const state = await mod.requestMemberDestination(data.email, MAIL_DOMAIN);
    if (state.verified) {
      await context.supabase
        .from("profiles")
        .update({ mail_forward_verified: true })
        .eq("id", context.userId);
    }
    const route = await mod.syncCloudflareRoute({
      userId: context.userId,
      handle,
      forwardTo: state.verified ? data.email : null,
      domain: MAIL_DOMAIN,
    });
    return {
      saved: true,
      verified: state.verified,
      message: route.synced ? state.message : `${state.message} ${route.message ?? ""}`.trim(),
    };
  });

/** Re-checks confirmation with Cloudflare and points the handle at the member's inbox. */
export const refreshMyMailForward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("mail_handle, mail_forward_to")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const email = (data?.mail_forward_to as string | null) ?? null;
    if (!email)
      return { verified: false, message: "Add your own inbox first, then confirm it." };
    const mod = await import("@/lib/mail-routing.server");
    const state = await mod.memberDestinationStatus(email, MAIL_DOMAIN);
    await context.supabase
      .from("profiles")
      .update({ mail_forward_verified: state.verified })
      .eq("id", context.userId);
    const route = await mod.syncCloudflareRoute({
      userId: context.userId,
      handle: (data?.mail_handle as string | null) ?? null,
      forwardTo: state.verified ? email : null,
      domain: MAIL_DOMAIN,
    });
    return {
      verified: state.verified,
      message: route.synced ? state.message : `${state.message} ${route.message ?? ""}`.trim(),
    };
  });

const OWNER_USER_ID = "9ab27da1-753c-4fba-bf47-6932ab7de55c";

/** Owner-only diagnostic: verifies the Cloudflare token's Email Routing access. */
export const checkMailRouting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== OWNER_USER_ID) throw new Error("Forbidden");
    const { checkCloudflareAccess } = await import("@/lib/mail-routing.server");
    return checkCloudflareAccess(MAIL_DOMAIN);
  });

/** Owner-only: which external inbox to verify in Cloudflare, and its status. */
export const getMailDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== OWNER_USER_ID) throw new Error("Forbidden");
    const { describeMailDestination } = await import("@/lib/mail-routing.server");
    return describeMailDestination(MAIL_DOMAIN);
  });

/**
 * Owner-only: pushes every claimed handle back into Cloudflare Email Routing,
 * pointing each rule at the member's verified inbox when there is one.
 */
export const resyncAllMailRoutes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== OWNER_USER_ID) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, mail_handle, mail_forward_to, mail_forward_verified")
      .not("mail_handle", "is", null);
    if (error) throw error;
    const { syncCloudflareRoute } = await import("@/lib/mail-routing.server");
    const rows = (data ?? []) as Array<{
      id: string;
      mail_handle: string;
      mail_forward_to: string | null;
      mail_forward_verified: boolean | null;
    }>;
    const results: Array<{ handle: string; synced: boolean; message?: string }> = [];
    for (const row of rows) {
      const res = await syncCloudflareRoute({
        userId: row.id,
        handle: row.mail_handle,
        forwardTo: row.mail_forward_verified ? row.mail_forward_to : null,
        domain: MAIL_DOMAIN,
      });
      results.push({
        handle: row.mail_handle,
        synced: res.synced,
        ...(res.message ? { message: res.message } : {}),
      });
    }
    const failed = results.filter((r) => !r.synced);
    return {
      total: results.length,
      synced: results.length - failed.length,
      failures: failed,
      message: failed.length
        ? `${results.length - failed.length} of ${results.length} handles synced; ${failed.length} need attention.`
        : `All ${results.length} handles are pointed at their verified inbox in Cloudflare.`,
    };
  });