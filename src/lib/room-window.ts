/**
 * Desktop (Electron) room pop-out helpers.
 *
 * On the packaged Mac/Windows/Linux apps we expose an IPC bridge that opens a
 * fixed-size DueChat window. On the web there is no bridge, so callers fall
 * back to normal in-app navigation.
 */
export function isDesktopShell(): boolean {
  return typeof window !== "undefined" && !!window.duechatDesktop;
}

export function roomWindowUrl(roomId: string): string {
  const url = new URL(`/chat/${roomId}`, window.location.origin);
  url.searchParams.set("popout", "1");
  return url.toString();
}

/** Returns true when the desktop window was requested. */
export function openRoomWindow(roomId: string): boolean {
  if (!isDesktopShell() || typeof window === "undefined") return false;
  if (window.opener) return false;
  void window.duechatDesktop!.openRoomWindow(roomWindowUrl(roomId));
  return true;
}
