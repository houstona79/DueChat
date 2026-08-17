const CF_API = "https://api.cloudflare.com/client/v4";

type CfRule = {
  tag: string;
  name?: string | null;
  matchers?: Array<{ type: string; field?: string; value?: string }>;
};

export class CfError extends Error {
  status: number;
  codes: number[];
  constructor(message: string, status: number, codes: number[]) {
    super(message);
    this.name = "CfError";
    this.status = status;
    this.codes = codes;
  }
}

/** Stable machine reasons surfaced to the UI. */
export type MailRouteReason =
  | "not_configured"
  | "missing_token"
  | "missing_destination"
  | "token_invalid"
  | "token_inactive"
  | "no_zone_read"
  | "zone_not_found"
  | "no_email_routing_read"
  | "no_email_routing_edit"
  | "email_routing_disabled"
  | "destination_unverified"
  | "address_taken"
  | "cloudflare_error";

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
    | {
        success?: boolean;
        result?: unknown;
        errors?: Array<{ message?: string; code?: number }>;
      }
    | null;
  if (!res.ok || !body?.success) {
    const msg = body?.errors?.map((e) => e.message).filter(Boolean).join("; ");
    const codes = (body?.errors ?? [])
      .map((e) => e.code)
      .filter((c): c is number => typeof c === "number");
    throw new CfError(msg || `Cloudflare request failed (${res.status})`, res.status, codes);
  }
  return body.result;
}

/** Maps a Cloudflare failure on a given capability to a clear reason + message. */
function classify(
  err: unknown,
  capability: "token" | "zone" | "routing_read" | "routing_edit",
): { reason: MailRouteReason; message: string } {
  if (!(err instanceof CfError)) {
    return {
      reason: "cloudflare_error",
      message: err instanceof Error ? err.message : "Cloudflare request failed.",
    };
  }
  const authProblem = err.status === 401 || err.codes.includes(1000) || err.codes.includes(10000);
  const permProblem = err.status === 403 || err.codes.includes(9109);
  if (authProblem)
    return {
      reason: "token_invalid",
      message: "The Cloudflare API token was rejected (invalid, revoked, or expired).",
    };
  if (permProblem) {
    if (capability === "zone")
      return {
        reason: "no_zone_read",
        message:
          "The token cannot read this zone. Add permission Zone → Zone → Read, scoped to this domain.",
      };
    if (capability === "routing_read")
      return {
        reason: "no_email_routing_read",
        message:
          "The token cannot read Email Routing. Add permission Zone → Email Routing Rules → Edit (Edit includes read).",
      };
    if (capability === "routing_edit")
      return {
        reason: "no_email_routing_edit",
        message:
          "The token can read Email Routing but cannot change rules. Change the permission Zone → Email Routing Rules from Read to Edit.",
      };
  }
  return { reason: "cloudflare_error", message: err.message };
}

async function zoneId(domain: string, token: string) {
  const fromEnv = process.env["CLOUDFLARE_ZONE_ID"];
  if (fromEnv) return fromEnv;
  const zones = (await cf(`/zones?name=${encodeURIComponent(domain)}`, token)) as Array<{
    id: string;
  }>;
  const id = zones?.[0]?.id;
  if (!id)
    throw new CfError(
      `No Cloudflare zone named ${domain} is visible to this token. Scope the token to that zone with Zone → Zone → Read.`,
      404,
      [],
    );
  return id;
}

export type MailRouteCheck = {
  ok: boolean;
  reason?: MailRouteReason;
  message: string;
  checks: {
    token: "ok" | "failed" | "skipped";
    zone: "ok" | "failed" | "skipped";
    routingRead: "ok" | "failed" | "skipped";
    routingEdit: "ok" | "failed" | "skipped";
  };
  destination?: string;
};

/**
 * Verifies the Cloudflare credentials end to end: token validity, zone read,
 * Email Routing read, and Email Routing *edit* (proved with a throwaway rule
 * that is deleted immediately). Returns clear per-step results.
 */
export async function checkCloudflareAccess(domain: string): Promise<MailRouteCheck> {
  const checks: MailRouteCheck["checks"] = {
    token: "skipped",
    zone: "skipped",
    routingRead: "skipped",
    routingEdit: "skipped",
  };
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  const destination = process.env["CLOUDFLARE_EMAIL_DESTINATION"];
  if (!token)
    return {
      ok: false,
      reason: "missing_token",
      message: "No Cloudflare API token is saved, so mail forwarding is not connected.",
      checks,
    };
  if (!destination)
    return {
      ok: false,
      reason: "missing_destination",
      message:
        "No forwarding destination address is saved. Add the verified Cloudflare destination address.",
      checks,
    };

  // 1. Token itself
  try {
    const verify = (await cf(`/user/tokens/verify`, token)) as { status?: string } | null;
    checks.token = "ok";
    if (verify?.status && verify.status !== "active") {
      checks.token = "failed";
      return {
        ok: false,
        reason: "token_inactive",
        message: `The Cloudflare API token is ${verify.status}. Create a new token and save it again.`,
        checks,
        destination,
      };
    }
  } catch (err) {
    checks.token = "failed";
    const c = classify(err, "token");
    return { ok: false, ...c, checks, destination };
  }

  // 2. Zone read
  let zone: string;
  try {
    zone = await zoneId(domain, token);
    checks.zone = "ok";
  } catch (err) {
    checks.zone = "failed";
    const c = classify(err, "zone");
    const reason = err instanceof CfError && err.status === 404 ? "zone_not_found" : c.reason;
    return { ok: false, reason, message: c.message, checks, destination };
  }

  // 3. Email Routing read — use the rules endpoint, which only needs the
  // Email Routing Rules permission. The zone-level routing *settings*
  // endpoint needs broader access, so it is checked opportunistically only.
  try {
    await cf(`/zones/${zone}/email/routing/rules?per_page=1`, token);
    checks.routingRead = "ok";
    const settings = (await cf(`/zones/${zone}/email/routing`, token).catch(() => null)) as {
      enabled?: boolean;
    } | null;
    if (settings && settings.enabled === false) {
      return {
        ok: false,
        reason: "email_routing_disabled",
        message: `Email Routing is not enabled for ${domain} in Cloudflare. Enable it, then re-run this check.`,
        checks,
        destination,
      };
    }
  } catch (err) {
    checks.routingRead = "failed";
    const c = classify(err, "routing_read");
    return { ok: false, ...c, checks, destination };
  }

  // 4. Email Routing edit — prove it by creating and deleting a probe rule.
  const probe = `duechat-token-check-${Date.now()}@${domain}`;
  let probeTag: string | null = null;
  try {
    const created = (await cf(`/zones/${zone}/email/routing/rules`, token, {
      method: "POST",
      body: JSON.stringify({
        name: "duechat:token-check",
        enabled: false,
        matchers: [{ type: "literal", field: "to", value: probe }],
        actions: [{ type: "forward", value: [destination] }],
      }),
    })) as { tag?: string } | null;
    probeTag = created?.tag ?? null;
    checks.routingEdit = "ok";
  } catch (err) {
    checks.routingEdit = "failed";
    const c = classify(err, "routing_edit");
    const destBad =
      err instanceof CfError && /destination|verif/i.test(err.message)
        ? "destination_unverified"
        : null;
    return {
      ok: false,
      reason: destBad ?? c.reason,
      message: destBad
        ? `Cloudflare rejected the destination ${destination}. Verify that address in Cloudflare → Email Routing → Destination addresses.`
        : c.message,
      checks,
      destination,
    };
  } finally {
    if (probeTag) {
      await cf(`/zones/${zone}/email/routing/rules/${probeTag}`, token, {
        method: "DELETE",
      }).catch(() => undefined);
    }
  }

  return {
    ok: true,
    message: `Cloudflare is connected: token valid, ${domain} readable, and Email Routing rules editable. Forwarding to ${destination}.`,
    checks,
    destination,
  };
}

/**
 * Reports the configured forwarding destination and whether Cloudflare
 * currently accepts it (verified). Proven with a throwaway disabled rule.
 */
export async function describeMailDestination(domain: string): Promise<{
  destination: string | null;
  sameDomain: boolean;
  verified: boolean;
  message: string;
}> {
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  const destination = process.env["CLOUDFLARE_EMAIL_DESTINATION"] ?? null;
  if (!destination)
    return {
      destination: null,
      sameDomain: false,
      verified: false,
      message:
        "No forwarding destination is saved yet. Add an external inbox you own (for example a Gmail or Outlook address).",
    };
  const sameDomain = destination.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
  if (sameDomain)
    return {
      destination,
      sameDomain,
      verified: false,
      message: `${destination} is on ${domain}, the same domain mail is forwarded from. Cloudflare can never verify it. Use an external inbox you own instead.`,
    };
  if (!token)
    return {
      destination,
      sameDomain,
      verified: false,
      message: "No Cloudflare API token is saved, so the destination cannot be checked.",
    };

  let zone: string;
  try {
    zone = await zoneId(domain, token);
  } catch {
    return {
      destination,
      sameDomain,
      verified: false,
      message: `Could not reach the ${domain} zone in Cloudflare to check the destination.`,
    };
  }

  let probeTag: string | null = null;
  try {
    const created = (await cf(`/zones/${zone}/email/routing/rules`, token, {
      method: "POST",
      body: JSON.stringify({
        name: "duechat:destination-check",
        enabled: false,
        matchers: [
          {
            type: "literal",
            field: "to",
            value: `duechat-destination-check-${Date.now()}@${domain}`,
          },
        ],
        actions: [{ type: "forward", value: [destination] }],
      }),
    })) as { tag?: string } | null;
    probeTag = created?.tag ?? null;
    return {
      destination,
      sameDomain,
      verified: true,
      message: `${destination} is verified in Cloudflare — member handles forward to it.`,
    };
  } catch (err) {
    const unverified = err instanceof CfError && /destination|verif/i.test(err.message);
    return {
      destination,
      sameDomain,
      verified: false,
      message: unverified
        ? `${destination} is not verified yet. Add it in Cloudflare → Email Routing → Destination addresses, click the confirmation link Cloudflare emails you, then re-run this check.`
        : err instanceof Error
          ? err.message
          : "Cloudflare rejected the destination check.",
    };
  } finally {
    if (probeTag) {
      await cf(`/zones/${zone}/email/routing/rules/${probeTag}`, token, {
        method: "DELETE",
      }).catch(() => undefined);
    }
  }
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
  /** The member's own inbox; used only when Cloudflare has confirmed it. */
  forwardTo?: string | null;
  /**
   * Only the owner's own handle may fall back to the shared DueChat inbox.
   * For everyone else we never point a handle at someone else's mailbox.
   */
  allowSharedFallback?: boolean;
}): Promise<{ synced: boolean; reason?: MailRouteReason; message?: string }> {
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  const shared = process.env["CLOUDFLARE_EMAIL_DESTINATION"];
  if (!token)
    return {
      synced: false,
      reason: "missing_token",
      message: "Mail forwarding isn't connected: no Cloudflare API token is saved.",
    };
  let destination = opts.allowSharedFallback ? shared : undefined;
  if (opts.forwardTo) {
    const state = await memberDestinationStatus(opts.forwardTo, opts.domain);
    if (state.verified) destination = opts.forwardTo;
  }
  let zone: string;
  try {
    zone = await zoneId(opts.domain, token);
  } catch (err) {
    const c = classify(err, "zone");
    const reason = err instanceof CfError && err.status === 404 ? "zone_not_found" : c.reason;
    return { synced: false, reason, message: c.message };
  }
  const ruleName = `duechat:${opts.userId}`;
  let rules: CfRule[];
  try {
    rules =
      ((await cf(`/zones/${zone}/email/routing/rules?per_page=200`, token)) as CfRule[]) ?? [];
  } catch (err) {
    const c = classify(err, "routing_read");
    return { synced: false, ...c };
  }
  const mine = rules.find((r) => r.name === ruleName);
  const address = opts.handle ? `${opts.handle}@${opts.domain}` : null;

  // No confirmed inbox of their own: remove any rule rather than delivering
  // this member's mail to somebody else's mailbox.
  if (!destination) {
    try {
      if (mine)
        await cf(`/zones/${zone}/email/routing/rules/${mine.tag}`, token, { method: "DELETE" });
    } catch {
      /* ignore cleanup failures */
    }
    return {
      synced: false,
      reason: "destination_unverified",
      message:
        "Forwarding is paused until you confirm your own inbox — mail to your handle is never sent to anyone else's mailbox.",
    };
  }

  try {
    if (!address) {
      if (mine)
        await cf(`/zones/${zone}/email/routing/rules/${mine.tag}`, token, { method: "DELETE" });
      return { synced: true };
    }

    const takenByOther = rules.some(
      (r) =>
        r.name !== ruleName &&
        r.matchers?.some((m) => m.value?.toLowerCase() === address.toLowerCase()),
    );
    if (takenByOther)
      return {
        synced: false,
        reason: "address_taken",
        message: `${address} already has a Cloudflare forwarding rule.`,
      };

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
  } catch (err) {
    const c = classify(err, "routing_edit");
    const destBad =
      err instanceof CfError && /destination|verif/i.test(err.message)
        ? {
            reason: "destination_unverified" as MailRouteReason,
            message: `Cloudflare rejected the destination ${destination}. Verify that address in Cloudflare → Email Routing → Destination addresses.`,
          }
        : null;
    return { synced: false, ...(destBad ?? c) };
  }
}
/* ---------------------------------------------------------------------------
 * Per-member forwarding destinations
 * Cloudflare only forwards to inboxes that have clicked its confirmation link,
 * so each member's own address must be registered and verified account-side.
 * ------------------------------------------------------------------------- */

type CfAddress = { tag: string; email: string; verified?: string | null };

async function accountId(domain: string, token: string) {
  const fromEnv = process.env["CLOUDFLARE_ACCOUNT_ID"];
  if (fromEnv) return fromEnv;
  let id: string | undefined;
  try {
    const zone = await zoneId(domain, token);
    const info = (await cf(`/zones/${zone}`, token)) as { account?: { id?: string } };
    id = info?.account?.id;
  } catch {
    id = undefined;
  }
  if (!id) {
    // Fall back to the accounts list (needs any account-scoped permission).
    const accounts = (await cf(`/accounts?per_page=1`, token).catch(() => null)) as
      | Array<{ id?: string }>
      | null;
    id = accounts?.[0]?.id;
  }
  if (!id)
    throw new CfError(
      "The Cloudflare token has no account-level access, so member inboxes can't be registered. Create a token with Account → Email Routing Addresses → Edit (and save the account ID).",
      403,
      [],
    );
  return id;
}

export type MemberDestinationState = {
  email: string | null;
  verified: boolean;
  known: boolean;
  message: string;
  reason?: MailRouteReason | "no_address_access";
};

async function listAddresses(domain: string, token: string) {
  const acct = await accountId(domain, token);
  const list =
    ((await cf(`/accounts/${acct}/email/routing/addresses?per_page=100`, token)) as CfAddress[]) ??
    [];
  return { acct, list };
}

/** Reads whether one member address is registered + verified in Cloudflare. */
export async function memberDestinationStatus(
  email: string,
  domain: string,
): Promise<MemberDestinationState> {
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  if (!token)
    return {
      email,
      verified: false,
      known: false,
      reason: "missing_token",
      message: "Mail forwarding isn't connected yet.",
    };
  try {
    const { list } = await listAddresses(domain, token);
    const found = list.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!found)
      return {
        email,
        verified: false,
        known: false,
        message: "This inbox isn't registered with Cloudflare yet.",
      };
    const verified = Boolean(found.verified);
    return {
      email,
      verified,
      known: true,
      message: verified
        ? `${email} is confirmed — your handle forwards straight to it.`
        : `${email} still needs confirming. Open the email Cloudflare sent you and click the link.`,
    };
  } catch (err) {
    return {
      email,
      verified: false,
      known: false,
      reason: "no_address_access",
      message:
        err instanceof CfError && (err.status === 403 || err.status === 401)
          ? "The Cloudflare token can't manage destination addresses. Add the account permission Email Routing Addresses → Edit."
          : err instanceof Error
            ? err.message
            : "Could not check that inbox with Cloudflare.",
    };
  }
}

/**
 * Registers a member's own inbox with Cloudflare so it receives a confirmation
 * email. Safe to call repeatedly — an existing address is reported as-is.
 */
export async function requestMemberDestination(
  email: string,
  domain: string,
): Promise<MemberDestinationState> {
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  if (!token)
    return {
      email,
      verified: false,
      known: false,
      reason: "missing_token",
      message: "Mail forwarding isn't connected yet.",
    };
  if (email.toLowerCase().endsWith(`@${domain.toLowerCase()}`))
    return {
      email,
      verified: false,
      known: false,
      reason: "destination_unverified",
      message: `Pick an inbox outside ${domain} — Cloudflare can't forward mail to the same domain it comes from.`,
    };
  try {
    const { acct, list } = await listAddresses(domain, token);
    const found = list.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (found?.verified)
      return {
        email,
        verified: true,
        known: true,
        message: `${email} is already confirmed.`,
      };
    if (found) {
      // Registered but never confirmed: Cloudflare confirmation links are
      // single-use and expire (clicking an old one shows an error page), so
      // drop the stale entry and register again to trigger a fresh email.
      await cf(`/accounts/${acct}/email/routing/addresses/${found.tag}`, token, {
        method: "DELETE",
      }).catch(() => undefined);
    }
    await cf(`/accounts/${acct}/email/routing/addresses`, token, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return {
      email,
      verified: false,
      known: true,
      message: `A fresh confirmation email was just sent to ${email} — open the newest one and click the link (older links expire), then re-check here.`,
    };
  } catch (err) {
    return {
      email,
      verified: false,
      known: false,
      reason: "no_address_access",
      message:
        err instanceof CfError && (err.status === 403 || err.status === 401)
          ? "The Cloudflare token can't add destination addresses. Add the account permission Email Routing Addresses → Edit."
          : err instanceof Error
            ? err.message
            : "Could not register that inbox with Cloudflare.",
    };
  }
}
