/** Helpers for Supabase password-recovery links, which can land on any route. */

function params(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const merged = new URLSearchParams(window.location.search);
  new URLSearchParams(hash).forEach((v, k) => merged.set(k, v));
  return merged;
}

/** True when the current URL is a password-recovery callback from the email link. */
export function isRecoveryUrl(): boolean {
  const p = params();
  return p.get("type") === "recovery";
}

/** The auth error carried by an expired or already-used recovery link, if any. */
export function recoveryLinkError(): string | null {
  const p = params();
  const code = p.get("error_code");
  const desc = p.get("error_description");
  if (!code && !desc) return null;
  if (code === "otp_expired") {
    return "That password reset link has expired. Request a new one below.";
  }
  return (desc ?? "That password reset link is no longer valid.").replace(/\+/g, " ");
}

/** PKCE-style links arrive with ?code= instead of tokens in the hash. */
export function recoveryCode(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("code");
}