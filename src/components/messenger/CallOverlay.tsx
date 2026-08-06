import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import type { Thread } from "@/lib/messenger";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function CallOverlay({
  thread,
  mode,
  onEnd,
}: {
  thread: Thread;
  mode: "voice" | "video";
  onEnd: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(mode === "video");
  const [speaker, setSpeaker] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setConnected(true), 1600);
    return () => window.clearTimeout(t);
  }, []);

  // Use the phone's real mic/camera so calls work from a mobile browser.
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError("This browser can't access the camera or microphone.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video" ? { facingMode: "user" } : false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMediaError(null);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setMediaError("Camera and microphone access was blocked.");
      }
    };
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
    if (camOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camOn]);

  useEffect(() => {
    if (!connected) return;
    const i = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(i);
  }, [connected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEnd]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${mode === "video" ? "Video" : "Voice"} call with ${thread.name}`}
      className="absolute inset-0 z-20 flex flex-col bg-sidebar/95 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur-sm"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        {mode === "video" && camOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-[3/4] w-full max-w-xs rounded-3xl bg-secondary object-cover"
          />
        ) : (
          <div className="scale-150">
            <Avatar name={thread.name} accent={thread.accent} />
          </div>
        )}
        <div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{thread.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {connected
              ? `${mode === "video" ? "Video" : "Voice"} call · ${formatDuration(seconds)}`
              : `Ringing…`}
          </p>
          {mediaError ? (
            <p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground">{mediaError}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-10 sm:gap-4">
        <CallButton
          label={muted ? "Unmute microphone" : "Mute microphone"}
          active={!muted}
          onClick={() => setMuted((v) => !v)}
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </CallButton>
        <CallButton
          label={camOn ? "Turn camera off" : "Turn camera on"}
          active={camOn}
          onClick={() => setCamOn((v) => !v)}
        >
          {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
        </CallButton>
        <CallButton
          label={speaker ? "Mute speaker" : "Unmute speaker"}
          active={speaker}
          onClick={() => setSpeaker((v) => !v)}
        >
          {speaker ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </CallButton>
        <button
          onClick={onEnd}
          aria-label="End call"
          className="grid size-16 place-items-center rounded-full bg-destructive text-destructive-foreground active:scale-95 sm:size-14"
        >
          <PhoneOff className="size-6 sm:size-5" />
        </button>
      </div>
    </div>
  );
}

function CallButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-14 place-items-center rounded-full transition-colors active:scale-95 sm:size-12",
        active ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}