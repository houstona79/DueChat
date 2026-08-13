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
  // Already inside a pop-out window: switch rooms in place instead of stacking
  // more windows, so the room list acts like normal navigation.
  if (/(^|[?&])popout=1(&|$)/.test(window.location.search)) return false;
  const url = roomWindowUrl(roomId);

  if (isDesktopShell()) {
    const desktop = window.duechatDesktop;
    if (!desktop) return false;
    // If the native window could not be created, fall back to in-app
    // navigation so the click is never a no-op.
    void Promise.resolve(desktop.openRoomWindow(url, kind))
      .then((opened) => {
        if (opened === false) window.location.assign(url);
      })
      .catch(() => window.location.assign(url));
    return true;
  }

  // Web: open a sized browser window. If the browser blocks it, fall back to
  // in-app navigation so the click is never a no-op.
  const size = kind === "im" ? { w: 400, h: 620 } : { w: 520, h: 780 };
  const features = `popup=yes,width=${size.w},height=${size.h},noopener=no`;
  try {
    const win = window.open(url, `duechat-${kind}-${roomId}`, features);
    if (win) {
      win.focus();
      return true;
    }
  } catch {
    // ignore and fall through
  }
  window.location.assign(url);
  return true;
}
