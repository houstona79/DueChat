import { useCallback, useEffect, useState } from "react";

/** Persisted audio device choices so a fixed routing sticks between calls. */
const MIC_KEY = "duechat.audio.mic";
const SPEAKER_KEY = "duechat.audio.speaker";

function read(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* storage blocked — selection still applies for this session */
  }
}

export type AudioDevice = { deviceId: string; label: string };

/** True when this browser can route output to a chosen speaker. */
export function canChooseSpeaker(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof HTMLMediaElement !== "undefined" &&
    "setSinkId" in HTMLMediaElement.prototype
  );
}

type SinkElement = HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };

/** Point a media element at the chosen speaker (no-op where unsupported). */
export function applySinkId(el: HTMLMediaElement | null, deviceId: string): void {
  const sinkEl = el as SinkElement | null;
  if (!sinkEl?.setSinkId || !deviceId) return;
  void sinkEl.setSinkId(deviceId).catch(() => undefined);
}

/**
 * Enumerates microphones and speakers and remembers the user's picks.
 * Labels are only exposed after mic permission is granted, so we fall back to
 * generic names until then.
 */
export function useAudioDevices() {
  const [mics, setMics] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [micId, setMicIdState] = useState(() => read(MIC_KEY));
  const [speakerId, setSpeakerIdState] = useState(() => read(SPEAKER_KEY));

  const refresh = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const map = (kind: MediaDeviceKind, fallback: string) =>
        devices
          .filter((d) => d.kind === kind)
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
      setMics(map("audioinput", "Microphone"));
      setSpeakers(map("audiooutput", "Speaker"));
    } catch {
      /* enumeration unavailable */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const md = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!md?.addEventListener) return;
    const onChange = () => void refresh();
    md.addEventListener("devicechange", onChange);
    return () => md.removeEventListener("devicechange", onChange);
  }, [refresh]);

  const setMicId = useCallback((id: string) => {
    setMicIdState(id);
    write(MIC_KEY, id);
  }, []);

  const setSpeakerId = useCallback((id: string) => {
    setSpeakerIdState(id);
    write(SPEAKER_KEY, id);
  }, []);

  return { mics, speakers, micId, speakerId, setMicId, setSpeakerId, refresh };
}
