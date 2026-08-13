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

export type RoomWindowKind = "room" | "im";

const WINDOW_SIZE: Record<RoomWindowKind, { width: number; height: number }> = {
  room: { width: 520, height: 780 },
  im: { width: 400, height: 620 },
};

export function roomWindowUrl(roomId: string): string {
  const url = new URL(`/chat/${roomId}`, window.location.origin);
  url.searchParams.set("popout", "1");
  return url.toString();
}

/**
 * Opens the room in its own window: a native fixed DueChat window on the
 * desktop apps, or a fixed-size browser pop-up on the web.
 * Returns true when a window was opened (so callers can preventDefault).
 */
export function openRoomWindow(roomId: string, kind: RoomWindowKind = "room"): boolean {
  if (typeof window === "undefined") return false;
  if (window.opener) return false;
  const url = roomWindowUrl(roomId);

  if (isDesktopShell()) {
    void window.duechatDesktop!.openRoomWindow(url, kind);
    return true;
  }

  const { width, height } = WINDOW_SIZE[kind];
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=yes",
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
  ].join(",");

  const win = window.open(url, `duechat-${kind}-${roomId}`, features);
  if (!win) return false;
  win.focus();
  return true;
}
