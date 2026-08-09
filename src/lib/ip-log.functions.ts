import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function clientIp(headers: Headers): string | null {
  const direct =
    headers.get("cf-connecting-ip") ?? headers.get("x-real-ip") ?? headers.get("true-client-ip");
  if (direct) return direct.trim();
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function isLocalIp(ip: string) {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

type Lookup = { vpn: boolean; network: string | null };

/**
 * Asks ip-api.com whether an address is a proxy/VPN exit or a hosting network.
 * Fails open: a lookup error must never lock a legitimate member out.
 */
async function lookupIp(ip: string): Promise<Lookup | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,isp,org`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      proxy?: boolean;
      hosting?: boolean;
      isp?: string;
      org?: string;
    };
    if (json.status !== "success") return null;
    return {
      vpn: Boolean(json.proxy) || Boolean(json.hosting),
      network: json.org || json.isp || null,
    };
  } catch {
    return null;
  }
}

/**
 * Records the caller's IP address for admin review and reports whether the
 * connection comes through a VPN/proxy. Admins and moderators are exempt.
 */
export const recordMyIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { deviceId?: string }) => input ?? {})
  .handler(async ({ data, context }) => {
    const request = getRequest();
    const ip = request?.headers ? clientIp(request.headers) : null;
    if (!ip || isLocalIp(ip)) return { ok: false as const, vpn: false as const };

    const lookup = await lookupIp(ip);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_ip_log").upsert(
      {
        user_id: context.userId,
        ip,
        device_id: data.deviceId ?? null,
        user_agent: request?.headers.get("user-agent")?.slice(0, 300) ?? null,
        is_vpn: lookup?.vpn ?? false,
        network: lookup?.network ?? null,
        checked_at: lookup ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,ip" },
    );

    if (!lookup?.vpn) return { ok: true as const, vpn: false as const };

    // Staff may connect through VPNs.
    const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" }),
    ]);
    if (isAdmin === true || isMod === true) return { ok: true as const, vpn: false as const };

    return { ok: true as const, vpn: true as const, network: lookup.network };
  });
