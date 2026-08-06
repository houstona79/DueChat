/** Cross-browser WebRTC/media helpers (Chrome, Safari/iOS, Firefox, Edge). */

type LegacyNavigator = Navigator & {
  getUserMedia?: (c: MediaStreamConstraints, s: (s: MediaStream) => void, e: (e: unknown) => void) => void;
  webkitGetUserMedia?: LegacyNavigator["getUserMedia"];
  mozGetUserMedia?: LegacyNavigator["getUserMedia"];
};

export function isWebRTCSupported() {
  return typeof window !== "undefined" && typeof window.RTCPeerConnection === "function";
}

/** Safari/older browsers: fall back to legacy prefixed getUserMedia. */
export async function getMediaStream(constraints: MediaStreamConstraints) {
  if (typeof navigator === "undefined") throw new Error("no-navigator");
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }
  const legacy = navigator as LegacyNavigator;
  const fn = legacy.getUserMedia ?? legacy.webkitGetUserMedia ?? legacy.mozGetUserMedia;
  if (!fn) throw new Error("unsupported");
  return new Promise<MediaStream>((resolve, reject) =>
    fn.call(navigator, constraints, resolve, reject),
  );
}

export function mediaErrorMessage(error: unknown) {
  const secure =
    typeof window === "undefined" ||
    window.isSecureContext ||
    window.location.hostname === "localhost";
  if (!secure) return "Calls need a secure (https) connection in this browser.";
  const name = (error as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera and microphone access was blocked. Allow it in your browser settings, then rejoin.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera or microphone was found on this device.";
  if (name === "NotReadableError")
    return "Your camera or microphone is already in use by another app.";
  return "This browser can't access the camera or microphone.";
}

/** Attach a stream to a media element with the legacy-Safari fallback and autoplay retry. */
export function attachStream(
  el: HTMLMediaElement | null,
  stream: MediaStream | null,
): void {
  if (!el) return;
  const legacy = el as HTMLMediaElement & { srcObject?: MediaStream | null; src?: string };
  try {
    legacy.srcObject = stream;
  } catch {
    if (stream && typeof URL.createObjectURL === "function") {
      legacy.src = URL.createObjectURL(stream as unknown as Blob);
    }
  }
  if (!stream) return;
  const play = () => el.play().catch(() => undefined);
  void play();
  // iOS Safari sometimes needs a nudge once tracks/metadata arrive.
  el.onloadedmetadata = () => void play();
}
