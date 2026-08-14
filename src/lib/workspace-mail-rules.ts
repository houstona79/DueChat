/** Shared, non-secret rules for member mailbox addresses. */
export const MAILBOX_OWNER_USER_ID = "9ab27da1-753c-4fba-bf47-6932ab7de55c";
export const MAILBOX_HANDLE_RE = /^[a-z0-9]([a-z0-9._-]{1,22})[a-z0-9]$/;
export const MAILBOX_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const RESERVED_MAILBOX_HANDLES = new Set([
  "admin","administrator","postmaster","abuse","support","help","root","info",
  "noreply","no-reply","notify","mail","webmaster","security","billing","staff",
  "duechat","owner","moderator",
]);
