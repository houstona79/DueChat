/**
 * Zoho Mail mailbox provisioning (Mail Admin API).
 *
 * Auth: a Zoho self-client / server-based OAuth app with the
 * ZohoMail.organization.accounts.ALL scope. Secrets (server-only):
 *   ZOHO_MAIL_CLIENT_ID       OAuth client id
 *   ZOHO_MAIL_CLIENT_SECRET   OAuth client secret
 *   ZOHO_MAIL_REFRESH_TOKEN   long-lived refresh token
 *   ZOHO_MAIL_ORG_ID          optional zoid; auto-detected when omitted
 *   ZOHO_MAIL_REGION          optional data centre: com (default), eu, in, au, jp, ca
 *
 * When these are absent the manual path is used instead: members request an
 * address, the owner creates it in the Zoho Mail admin console (the free plan
 * has no provisioning API) and marks the request as created.
 */

export type ZohoReason = "not_configured" | "address_taken" | "not_found" | "zoho_error";

export class ZohoMailError extends Error {
  reason: ZohoReason;
  constructor(message: string, reason: ZohoReason) {
    super(message);
    this.name = "ZohoMailError";
    this.reason = reason;
  }
}

function config() {
  const clientId = process.env["ZOHO_MAIL_CLIENT_ID"];
  const clientSecret = process.env["ZOHO_MAIL_CLIENT_SECRET"];
  const refreshToken = process.env["ZOHO_MAIL_REFRESH_TOKEN"];
  if (!clientId || !clientSecret || !refreshToken) return null;
  const region = (process.env["ZOHO_MAIL_REGION"] || "com").toLowerCase();
  return {
    clientId,
    clientSecret,
    refreshToken,
    orgId: process.env["ZOHO_MAIL_ORG_ID"] || null,
    accounts: `https://accounts.zoho.${region}`,
    api: `https://mail.zoho.${region}/api`,
  };
}

export function isConfigured() {
  return config() !== null;
}

export function webmailUrl() {
  const region = (process.env["ZOHO_MAIL_REGION"] || "com").toLowerCase();
  return `https://mail.zoho.${region}`;
}

export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return (
    Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("") + "!7"
  );
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  const cfg = config();
  if (!cfg)
    throw new ZohoMailError(
      "Zoho Mail isn't connected yet — the site owner still has to add the API credentials.",
      "not_configured",
    );
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const params = new URLSearchParams({
    refresh_token: cfg.refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(`${cfg.accounts}/oauth/v2/token?${params.toString()}`, {
    method: "POST",
  });
  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string }
    | null;
  if (!res.ok || !json?.access_token)
    throw new ZohoMailError(
      `Zoho refused the API credentials${json?.error ? `: ${json.error}` : ""}.`,
      "zoho_error",
    );
  cached = {
    token: json.access_token,
    expires: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = config();
  if (!cfg) throw new ZohoMailError("Zoho Mail isn't connected yet.", "not_configured");
  const token = await accessToken();
  const res = await fetch(`${cfg.api}${path}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message =
      (json as { data?: { errorCode?: string }; status?: { description?: string } } | null)?.status
        ?.description ?? `Zoho returned ${res.status}.`;
    if (res.status === 404) throw new ZohoMailError("That mailbox isn't at Zoho.", "not_found");
    if (/exist|duplicate/i.test(message))
      throw new ZohoMailError("That address already exists at Zoho.", "address_taken");
    throw new ZohoMailError(message, "zoho_error");
  }
  return json as T;
}

async function orgId(): Promise<string> {
  const cfg = config();
  if (cfg?.orgId) return cfg.orgId;
  const res = await call<{ data?: Array<{ zoid?: number | string }> }>("/organization");
  const zoid = res?.data?.[0]?.zoid;
  if (!zoid) throw new ZohoMailError("Couldn't read your Zoho organisation id.", "zoho_error");
  return String(zoid);
}

/** Owner diagnostic: proves the credentials work and the domain is hosted at Zoho. */
export async function checkAccess(domain: string) {
  if (!isConfigured())
    return {
      ok: false,
      manual: true,
      message:
        "Zoho API credentials aren't set, so mailbox requests use the manual path — you create each address in the Zoho Mail admin console.",
    };
  try {
    const zoid = await orgId();
    const res = await call<{ data?: Array<{ domainName?: string; verificationStatus?: string }> }>(
      `/organization/${zoid}/domains`,
    );
    const domains = (res?.data ?? []).map((d) => (d.domainName ?? "").toLowerCase());
    const found = domains.includes(domain.toLowerCase());
    return {
      ok: found,
      manual: false,
      message: found
        ? `Connected to Zoho Mail — ${domain} is hosted in your organisation (id ${zoid}).`
        : `Connected to Zoho, but ${domain} isn't in that organisation. Add and verify the domain in Zoho Mail first.`,
    };
  } catch (err) {
    return {
      ok: false,
      manual: false,
      message: err instanceof ZohoMailError ? err.message : "Couldn't reach Zoho Mail.",
    };
  }
}

export async function createMailbox(input: {
  address: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<{ id: string | null }> {
  const zoid = await orgId();
  const res = await call<{ data?: { zuid?: number | string; accountId?: string } }>(
    `/organization/${zoid}/accounts`,
    {
      method: "POST",
      body: JSON.stringify({
        primaryEmailAddress: input.address,
        password: input.password,
        displayName: `${input.firstName} ${input.lastName}`.trim(),
        firstName: input.firstName,
        lastName: input.lastName,
        role: "member",
      }),
    },
  );
  const id = res?.data?.accountId ?? res?.data?.zuid ?? null;
  return { id: id === null ? null : String(id) };
}

async function accountIdFor(address: string): Promise<string> {
  const zoid = await orgId();
  const res = await call<{
    data?: Array<{ accountId?: string; zuid?: number | string; primaryEmailAddress?: string }>;
  }>(`/organization/${zoid}/accounts?searchKey=${encodeURIComponent(address)}`);
  const hit = (res?.data ?? []).find(
    (a) => (a.primaryEmailAddress ?? "").toLowerCase() === address.toLowerCase(),
  );
  const id = hit?.accountId ?? hit?.zuid;
  if (!id) throw new ZohoMailError("That mailbox isn't at Zoho.", "not_found");
  return String(id);
}

export async function setEnabled(address: string, enabled: boolean) {
  const zoid = await orgId();
  const accountId = await accountIdFor(address);
  await call(`/organization/${zoid}/accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify({ mode: enabled ? "enableAccount" : "disableAccount" }),
  });
}

export async function setPassword(address: string, password: string) {
  const zoid = await orgId();
  const accountId = await accountIdFor(address);
  await call(`/organization/${zoid}/accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify({ mode: "resetPassword", password }),
  });
}

export async function deleteMailbox(address: string) {
  const zoid = await orgId();
  const accountId = await accountIdFor(address);
  await call(`/organization/${zoid}/accounts/${accountId}`, { method: "DELETE" });
}
