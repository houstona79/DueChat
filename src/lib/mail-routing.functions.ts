import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAIL_DOMAIN } from "@/lib/chat";

export const syncMyMailRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("mail_handle")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const { syncCloudflareRoute } = await import("@/lib/mail-routing.server");
    return syncCloudflareRoute({
      userId: context.userId,
      handle: (data?.mail_handle as string | null) ?? null,
      domain: MAIL_DOMAIN,
    });
  });

/** Staff-only diagnostic: verifies the Cloudflare token's Email Routing access. */
export const checkMailRouting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isStaff, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw error;
    if (!isStaff) throw new Error("Forbidden");
    const { checkCloudflareAccess } = await import("@/lib/mail-routing.server");
    return checkCloudflareAccess(MAIL_DOMAIN);
  });