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