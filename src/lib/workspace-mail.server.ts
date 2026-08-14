/**
 * Google Workspace mailbox provisioning (Admin SDK Directory API).
 *
 * Auth: a Google Cloud service account with domain-wide delegation, impersonating
 * a Workspace super-admin. Secrets (server-only):
 *   GOOGLE_WORKSPACE_SA_EMAIL        service account client_email
 *   GOOGLE_WORKSPACE_SA_PRIVATE_KEY  service account private_key (PEM, \n escapes ok)
 *   GOOGLE_WORKSPACE_ADMIN_EMAIL     admin to impersonate, e.g. you@comtv.us
 */

const DIRECTORY = "https://admin.googleapis.com/admin/directory/v1";
const SCOPE = "https://www.googleapis.com/auth/admin.directory.user";

export type MailboxReason =
  | "not_configured"
  | "address_taken"
  | "not_found"
  | "google_error";

export class MailboxError extends Error {
  reason: MailboxReason;
  status: number;
  constructor(message: string, reason: MailboxReason, status = 400) {
    super(message);
    this.name = "MailboxError";
    this.reason = reason;
    this.status = status;
  }
}

function config() {
  const clientEmail = process.env["GOOGLE_WORKSPACE_SA_EMAIL"];
  const rawKey = process.env["GOOGLE_WORKSPACE_SA_PRIVATE_KEY"];
  const admin = process.env["GOOGLE_WORKSPACE_ADMIN_EMAIL"];
  if (!clientEmail || !rawKey || !admin) return null;
  return { clientEmail, privateKey: rawKey.replace(/\\n/g, "\n"), admin };
}

export function isConfigured() {
  return config() !== null;
}

function b64url(bytes: Uint8Array | string) {
  const str =
    typeof bytes === "string"
      ? bytes
      : String.fromCharCode(...Array.from(bytes));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importKey(pem: string) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

let cached: { token: string; expires: number } | null = null;

/** Signs a delegated JWT and exchanges it for a Directory API access token. */
async function accessToken(): Promise<string> {
  const cfg = config();
  if (!cfg)
    throw new MailboxError(
      "Google Workspace isn't connected yet — add the service account details first.",
      "not_configured",
    );
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: cfg.clientEmail,
      sub: cfg.admin,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await importKey(cfg.privateKey);
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${claim}`),
    ),
  );
  const assertion = `${header}.${claim}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string; error?: string }
    | null;
  if (!res.ok || !body?.access_token) {
    throw new MailboxError(
      body?.error_description ||
        body?.error ||
        `Google rejected the sign-in request (${res.status}).`,
      "google_error",
      res.status,
    );
  }
  cached = {
    token: body.access_token,
    expires: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

async function directory(path: string, init?: RequestInit) {
  const token = await accessToken();
  const res = await fetch(`${DIRECTORY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 204) return null;
  const body = (await res.json().catch(() => null)) as
    | { error?: { message?: string; code?: number } }
    | null;
  if (!res.ok) {
    const msg = body?.error?.message ?? `Google request failed (${res.status}).`;
    if (res.status === 404) throw new MailboxError(msg, "not_found", 404);
    if (res.status === 409 || /already exists|entity already/i.test(msg))
      throw new MailboxError("That address is already in use.", "address_taken", 409);
    console.error(`Google Directory failed [${res.status}] ${path}: ${msg}`);
    throw new MailboxError(msg, "google_error", res.status);
  }
  return body as unknown;
}

/** Cryptographically random starter password the member is asked to change. */
export function generatePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*";
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

export type GoogleMailbox = {
  id: string;
  primaryEmail: string;
  suspended: boolean;
  lastLoginTime?: string | null;
  creationTime?: string | null;
};

export async function getMailbox(address: string): Promise<GoogleMailbox | null> {
  try {
    const user = (await directory(`/users/${encodeURIComponent(address)}`)) as
      | (GoogleMailbox & Record<string, unknown>)
      | null;
    return user
      ? {
          id: String(user.id),
          primaryEmail: String(user.primaryEmail),
          suspended: Boolean(user.suspended),
          lastLoginTime: (user.lastLoginTime as string | null) ?? null,
          creationTime: (user.creationTime as string | null) ?? null,
        }
      : null;
  } catch (err) {
    if (err instanceof MailboxError && err.reason === "not_found") return null;
    throw err;
  }
}

export async function createMailbox(input: {
  address: string;
  givenName: string;
  familyName: string;
  password: string;
  recoveryEmail?: string | null;
}) {
  const existing = await getMailbox(input.address);
  if (existing)
    throw new MailboxError("That address is already in use.", "address_taken", 409);
  const user = (await directory("/users", {
    method: "POST",
    body: JSON.stringify({
      primaryEmail: input.address,
      name: { givenName: input.givenName, familyName: input.familyName },
      password: input.password,
      changePasswordAtNextLogin: true,
      ...(input.recoveryEmail ? { recoveryEmail: input.recoveryEmail } : {}),
    }),
  })) as { id?: string } | null;
  return { id: user?.id ? String(user.id) : null };
}

export async function setSuspended(address: string, suspended: boolean) {
  await directory(`/users/${encodeURIComponent(address)}`, {
    method: "PUT",
    body: JSON.stringify({ suspended }),
  });
}

export async function setPassword(address: string, password: string) {
  await directory(`/users/${encodeURIComponent(address)}`, {
    method: "PUT",
    body: JSON.stringify({ password, changePasswordAtNextLogin: true }),
  });
}

export async function deleteMailbox(address: string) {
  await directory(`/users/${encodeURIComponent(address)}`, { method: "DELETE" });
}

/** Owner diagnostic: can we talk to the Directory API with these credentials? */
export async function checkAccess(domain: string) {
  const checks: Record<string, string> = {};
  if (!isConfigured()) {
    return {
      ok: false,
      reason: "not_configured" as MailboxReason,
      checks,
      message:
        "Google Workspace isn't connected yet — add the service account email, private key and admin address.",
    };
  }
  try {
    await accessToken();
    checks["token"] = "ok";
  } catch (err) {
    checks["token"] = err instanceof Error ? err.message : "failed";
    return {
      ok: false,
      reason: "google_error" as MailboxReason,
      checks,
      message:
        "Google wouldn't issue a token. Check the service account key and that domain-wide delegation is granted for the Directory scope.",
    };
  }
  try {
    await directory(`/users?domain=${encodeURIComponent(domain)}&maxResults=1`);
    checks["directory"] = "ok";
  } catch (err) {
    checks["directory"] = err instanceof Error ? err.message : "failed";
    return {
      ok: false,
      reason: "google_error" as MailboxReason,
      checks,
      message: `Signed in, but couldn't list users on ${domain}. Make sure the impersonated admin is a super admin on that domain.`,
    };
  }
  return {
    ok: true,
    reason: null,
    checks,
    message: `Connected — DueChat can create and manage mailboxes on ${domain}.`,
  };
}
