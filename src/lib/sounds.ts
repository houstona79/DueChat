import { useCallback, useEffect, useState } from "react";

/**
 * Small Web Audio chimes for notifications. No audio files needed: each cue is
 * a short synthesized tone pair, so it works offline and never blocks paint.
 */
const KEY = "duechat.sounds";

export type SoundCue =
  | "notification"
  | "message"
  | "support"
  | "invite"
  | "ring"
  | "dial"
  | "connected"
  | "alert";

const CUES: Record<SoundCue, { notes: number[]; gain: number; step: number; dur: number }> = {
  notification: { notes: [660, 880], gain: 0.14, step: 0.09, dur: 0.16 },
  // DM chime: louder two-tone so it carries over room audio and phone speakers.
  message: { notes: [660, 880], gain: 0.42, step: 0.1, dur: 0.2 },
  support: { notes: [740, 988, 740], gain: 0.16, step: 0.11, dur: 0.16 },
  invite: { notes: [587, 784, 1046], gain: 0.14, step: 0.1, dur: 0.18 },
  ring: { notes: [880, 660, 880, 660], gain: 0.18, step: 0.18, dur: 0.22 },
  // Outgoing ringback: two soft low tones, like a phone ringing on the far end.
  dial: { notes: [440, 480], gain: 0.12, step: 0.42, dur: 0.4 },
  connected: { notes: [660, 880, 1046], gain: 0.14, step: 0.08, dur: 0.14 },
  alert: { notes: [440, 440], gain: 0.2, step: 0.16, dur: 0.2 },
};

export function soundsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage blocked — applies for this session only */
  }
}

type Ctx = AudioContext & { resume: () => Promise<void> };
let ctx: Ctx | null = null;

function context(): Ctx | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor() as Ctx;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/** Plays a cue unless the member muted sounds or reduced-motion is requested. */
export function playSound(cue: SoundCue = "notification") {
  if (!soundsEnabled()) return;
  const ac = context();
  if (!ac) return;
  const { notes, gain, step, dur } = CUES[cue];
  const start = ac.currentTime + 0.01;
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const vol = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const at = start + i * step;
    vol.gain.setValueAtTime(0, at);
    vol.gain.linearRampToValueAtTime(gain, at + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(vol).connect(ac.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  });
}

/** Unlocks audio on the first user gesture so later cues are audible on iOS. */
export function useSoundUnlock() {
  useEffect(() => {
    const unlock = () => context();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
}

export function useSounds() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => setEnabled(soundsEnabled()), []);
  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setSoundsEnabled(next);
      if (next) playSound("notification");
      return next;
    });
  }, []);
  return { enabled, toggle };
}
