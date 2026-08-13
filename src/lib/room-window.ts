/**
 * Desktop (Electron) room pop-out helpers.
 *
 * On the packaged Mac/Windows/Linux apps we expose an IPC bridge that opens a
 * fixed-size DueChat window. On the web there is no bridge, so callers keep
 * normal in-app navigation instead of opening a browser window.
 */
export function isDesktopShell(): boolean {
  return typeof window !== "undefined" && !!window.duechatDesktop;
}

export type RoomWindowKind = "room" | "im";

export function roomWindowUrl(roomId: string): string {
  const url = new URL(`/chat/${roomId}`, window.location.origin);
  url.searchParams.set("popout", "1");
  return url.toString();
}

/**
 * Opens the room in a native fixed DueChat window in the desktop apps.
 * Browser users navigate normally in the existing tab.
 * Returns true when a window was opened (so callers can preventDefault).
 */
export function openRoomWindow(roomId: string, kind: RoomWindowKind = "room"): boolean {
  if (typeof window === "undefined") return false;
  if (window.opener) return false;
  const url = roomWindowUrl(roomId);

  if (isDesktopShell()) {
    const desktop = window.duechatDesktop;
    if (!desktop) return false;
    void desktop.openRoomWindow(url, kind);
    return true;
  }
  return false;
}
