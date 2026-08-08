import { useEffect, useRef, useState } from "react";

/**
 * Analyse the live audio level of a MediaStream.
 * Returns a 0-1 value (0 = silence, 1 = peak).
 *
 * The analyser reads from the local stream's audio track, so it will show 0
 * while the mic is disabled, and reflect the actual input level while the mic
 * is active.
 */
export function useMicLevel(stream: MediaStream | null | undefined, enabled: boolean) {
  const [level, setLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !stream || typeof window === "undefined") {
      setLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLevel(0);
      return;
    }

    const Ctor = window.AudioContext ?? (
      window as unknown as { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext;
    if (!Ctor) {
      setLevel(0);
      return;
    }

    const ctx = new Ctor();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    let source: MediaStreamAudioSourceNode | null = null;
    try {
      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
    } catch {
      // Stream may be in a bad state; bail out.
      void ctx.close();
      setLevel(0);
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] ?? 0;
      const average = data.length ? sum / data.length : 0;
      setLevel(average / 255);
      rafRef.current = requestAnimationFrame(tick);
    };

    ctx
      .resume()
      .then(() => {
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => undefined);

    ctxRef.current = ctx;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source?.disconnect();
      } catch {
        /* noop */
      }
      try {
        analyser.disconnect();
      } catch {
        /* noop */
      }
      void ctx.close();
      ctxRef.current = null;
    };
  }, [stream, enabled]);

  return level;
}
