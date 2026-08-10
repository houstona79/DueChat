import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The owner account is the only one allowed to permanently delete members. */
const OWNER_USER_ID = "9ab27da1-753c-4fba-bf47-6932ab7de55c";

/**
 * Permanently deletes a member account and everything attached to it.
 * Owner-only: verified server-side against the signed-in user's id.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId || typeof input.userId !== "string") throw new Error("Missing userId");
    return { userId: input.userId };
  })
  .handler(async ({ data, context }) => {
    if (context.userId !== OWNER_USER_ID) throw new Error("Forbidden");
    if (data.userId === OWNER_USER_ID) throw new Error("The owner account cannot be deleted");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // These rows do not cascade, so clear them before removing the account.
    await supabaseAdmin.from("trivia_rounds").delete().eq("started_by", data.userId);
    await supabaseAdmin.from("trivia_rounds").update({ winner_id: null }).eq("winner_id", data.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
