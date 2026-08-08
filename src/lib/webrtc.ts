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

/**
 * Android WebViews/Chrome frequently reject exact-ish constraints
 * (OverconstrainedError / NotReadableError) even when a camera exists.
 * Try progressively simpler constraint sets before giving up.
 */
export async function getMediaStreamResilient(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  const wantsVideo = Boolean(constraints.video);
  const wantsAudio = Boolean(constraints.audio);
  const attempts: MediaStreamConstraints[] = [constraints];

  if (wantsVideo && typeof constraints.video === "object") {
    attempts.push({ audio: constraints.audio ?? false, video: { facingMode: "user" } });
    attempts.push({ audio: constraints.audio ?? false, video: true });
  }
  if (wantsVideo && wantsAudio) {
    // Some devices only allow one device at a time — grab video alone last.
    attempts.push({ audio: false, video: true });
  }
  if (wantsAudio && !wantsVideo) {
    attempts.push({ audio: true, video: false });
  }

  let lastError: unknown = new Error("unsupported");
  for (const attempt of attempts) {
    try {
      return await getMediaStream(attempt);
    } catch (error) {
      lastError = error;
      const name = (error as { name?: string } | null)?.name;
      // Permission denials won't be fixed by looser constraints.
      if (name === "NotAllowedError" || name === "SecurityError") throw error;
    }
  }
  throw lastError;
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

/**
 * Android Chrome blocks unmuted playback without a fresh gesture in some
 * WebViews. Retry playback on the next user interaction if it was rejected.
 */
export function playWithUnlock(el: HTMLMediaElement | null): void {
  if (!el) return;
  el.play().catch(() => {
    const retry = () => {
      void el.play().catch(() => undefined);
      document.removeEventListener("pointerdown", retry);
      document.removeEventListener("touchend", retry);
    };
    document.addEventListener("pointerdown", retry, { once: true });
    document.addEventListener("touchend", retry, { once: true });
  });
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
let unlockedCtx: AudioContext | null = null;

/**
 * iOS/Safari keeps WebRTC audio output locked until an AudioContext has been
 * resumed inside a real user gesture. Call this from a pointer/touch handler.
 */
export function unlockAudioPlayback(): void {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return;
  try {
    if (!unlockedCtx) unlockedCtx = new Ctor();
    if (unlockedCtx.state === "suspended") void unlockedCtx.resume();
    const source = unlockedCtx.createBufferSource();
    source.buffer = unlockedCtx.createBuffer(1, 1, 22050);
    source.connect(unlockedCtx.destination);
    source.start(0);
  } catch {
    /* noop */
  }
}
