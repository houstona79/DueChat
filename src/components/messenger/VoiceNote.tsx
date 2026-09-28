import { useEffect, useRef, useState } from "react";
import { Mic, Square, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const VOICE_PREFIX = "voice-note:";
const MAX_SECONDS = 120;

export function voiceNotePath(body: string): string | null {
  return body.startsWith(VOICE_PREFIX) ? body.slice(VOICE_PREFIX.length).trim() : null;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function VoiceNotePlayer({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.storage
      .from("voice-notes")
      .createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data) setFailed(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  return (
    <div className="mt-1 inline-flex max-w-full items-center gap-2 rounded-2xl border border-border bg-card px-2 py-1">
      <Mic className="size-4 shrink-0 text-primary" aria-hidden />
      {failed ? (
        <span className="text-xs text-muted-foreground">Voice note unavailable</span>
      ) : url ? (
        <audio controls preload="metadata" src={url} className="h-9 w-56 max-w-full" />
      ) : (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

export function VoiceRecorder({
  userId,
  disabled,
  onSend,
  onError,
}: {
  userId: string;
  disabled?: boolean;
  onSend: (body: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "review" | "sending">("idle");
  const [secs, setSecs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => () => cleanupStream(), []);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) =>
        MediaRecorder.isTypeSupported?.(t),
      );
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        cleanupStream();
        const b = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        setBlob(b);
        setPreview(URL.createObjectURL(b));
        setState("review");
      };
      recRef.current = rec;
      rec.start();
      setSecs(0);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        setSecs((s) => {
          if (s + 1 >= MAX_SECONDS) rec.state === "recording" && rec.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      onError("Microphone access was blocked. Allow the microphone to record voice notes.");
    }
  };

  const stop = () => recRef.current?.state === "recording" && recRef.current.stop();
  const discard = () => {
    setBlob(null);
    setPreview(null);
    setState("idle");
  };
  const send = async () => {
    if (!blob) return;
    setState("sending");
    try {
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("voice-notes")
        .upload(path, blob, { contentType: blob.type });
      if (error) throw error;
      await onSend(VOICE_PREFIX + path);
      discard();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Voice note failed to send.");
      setState("review");
    }
  };

  if (state === "idle")
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => void start()}
        title="Record voice note"
        aria-label="Record voice note"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-primary disabled:opacity-50"
      >
        <Mic className="size-5" />
      </button>
    );

  if (state === "recording")
    return (
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-1 text-xs text-destructive">
        <span className="size-2 animate-pulse rounded-full bg-destructive" />
        {fmt(secs)}
        <button type="button" onClick={stop} aria-label="Stop recording" className="grid size-7 place-items-center rounded-full hover:bg-destructive/20">
          <Square className="size-4" />
        </button>
      </div>
    );

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-background px-1.5 py-1">
      {preview ? <audio controls src={preview} className="h-8 w-40" /> : null}
      <button type="button" onClick={discard} disabled={state === "sending"} aria-label="Discard voice note" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
        <X className="size-4" />
      </button>
      <button type="button" onClick={() => void send()} disabled={state === "sending"} aria-label="Send voice note" className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
        {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      </button>
    </div>
  );
}
