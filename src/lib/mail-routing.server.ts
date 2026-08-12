const CF_API = "https://api.cloudflare.com/client/v4";

type CfRule = {
  tag: string;
  name?: string | null;
  matchers?: Array<{ type: string; field?: string; value?: string }>;
};

async function cf(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => null)) as
    | { success?: boolean; result?: unknown; errors?: Array<{ message?: string }> }
    | null;
  if (!res.ok || !body?.success) {
    const msg = body?.errors?.map((e) => e.message).filter(Boolean).join("; ");
    throw new Error(msg || `Cloudflare request failed (${res.status})`);
  }
  return body.result;
}

async function zoneId(domain: string, token: string) {
  const fromEnv = process.env["CLOUDFLARE_ZONE_ID"];
  if (fromEnv) return fromEnv;
  const zones = (await cf(`/zones?name=${encodeURIComponent(domain)}`, token)) as Array<{
    id: string;
  }>;
  const id = zones?.[0]?.id;
  if (!id) throw new Error(`No Cloudflare zone found for ${domain}`);
  return id;
}

/**
 * Creates/updates/removes the Cloudflare Email Routing rule that forwards
 * `<handle>@<domain>` to the shared verified destination address.
 * Each member owns exactly one rule, tracked by the rule name `duechat:<userId>`.
 */
export async function syncCloudflareRoute(opts: {
  userId: string;
  handle: string | null;
  domain: string;
}): Promise<{ synced: boolean; reason?: string }> {
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  const destination = process.env["CLOUDFLARE_EMAIL_DESTINATION"];
  if (!token || !destination) return { synced: false, reason: "not_configured" };

  const zone = await zoneId(opts.domain, token);
  const ruleName = `duechat:${opts.userId}`;
  const rules = ((await cf(
    `/zones/${zone}/email/routing/rules?per_page=200`,
    token,
  )) as CfRule[]) ?? [];
  const mine = rules.find((r) => r.name === ruleName);
  const address = opts.handle ? `${opts.handle}@${opts.domain}` : null;

  if (!address) {
    if (mine) await cf(`/zones/${zone}/email/routing/rules/${mine.tag}`, token, { method: "DELETE" });
    return { synced: true };
  }

  const takenByOther = rules.some(
    (r) =>
      r.name !== ruleName &&
      r.matchers?.some((m) => m.value?.toLowerCase() === address.toLowerCase()),
  );
  if (takenByOther) return { synced: false, reason: "address_taken" };

  const payload = {
    name: ruleName,
    enabled: true,
    matchers: [{ type: "literal", field: "to", value: address }],
    actions: [{ type: "forward", value: [destination] }],
  };

  if (mine) {
    await cf(`/zones/${zone}/email/routing/rules/${mine.tag}`, token, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  } else {
    await cf(`/zones/${zone}/email/routing/rules`, token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  return { synced: true };
}