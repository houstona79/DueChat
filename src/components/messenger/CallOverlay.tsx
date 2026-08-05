import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const t = window.setTimeout(() => setConnected(true), 1600);
    return () => window.clearTimeout(t);
  }, []);

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
      className="absolute inset-0 z-20 flex flex-col bg-sidebar/95 backdrop-blur-sm"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {mode === "video" && camOn ? (
          <div className="grid aspect-[3/4] w-full max-w-xs place-items-center rounded-3xl bg-secondary text-xs text-muted-foreground">
            Camera preview
          </div>
        ) : (
          <div className="scale-150">
            <Avatar name={thread.name} accent={thread.accent} />
          </div>
        )}
        <div>
          <h2 className="font-display text-xl font-semibold">{thread.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {connected
              ? `${mode === "video" ? "Video" : "Voice"} call · ${formatDuration(seconds)}`
              : `Ringing…`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pb-10">
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
          className="grid size-14 place-items-center rounded-full bg-destructive text-destructive-foreground"
        >
          <PhoneOff className="size-5" />
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
        "grid size-12 place-items-center rounded-full transition-colors",
        active ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}