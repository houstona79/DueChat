/**
 * Version of the packaged desktop app (Mac/Windows/Linux).
 * Bump this whenever new desktop binaries are published so installed
 * desktop apps prompt their users to update.
 */
export const DESKTOP_VERSION = "1.2.6";

/** Human-readable notes shown in the desktop update prompt. */
export const DESKTOP_RELEASE_NOTES =
  "Mac fix: clicking a room or DM now always opens a fixed DueChat window — previously a slow-loading window could stay hidden and the click did nothing. Re-download and replace your current DueChat app to get the update.";
