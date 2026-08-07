import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function clientIp(headers: Headers): string | null {
  const direct =
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("true-client-ip");
  if (direct) return direct.trim();
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

/** Records the caller's IP address so admins can review it later. */
export const recordMyIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { deviceId?: string }) => input ?? {})
  .handler(async ({ data, context }) => {
    const request = getRequest();
    const ip = request?.headers ? clientIp(request.headers) : null;
    if (!ip) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_ip_log").upsert(
      {
        user_id: context.userId,
        ip,
        device_id: data.deviceId ?? null,
        user_agent: request?.headers.get("user-agent")?.slice(0, 300) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,ip" },
    );
    if (error) throw error;
    return { ok: true as const };
  });
