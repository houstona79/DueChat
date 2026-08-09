import {
  ChevronDown,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { CallChat } from "./CallChat";
import { useGroupCall, type CallPeer } from "@/hooks/use-group-call";
import { accentFor } from "@/lib/chat";
import { attachStream, playWithUnlock } from "@/lib/webrtc";
import { applySinkId, useAudioDevices } from "@/lib/audio-devices";
import { AudioDeviceMenu } from "./AudioDeviceMenu";
import { cn } from "@/lib/utils";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function CallOverlay({
  title,
  accent,
  mode,
  roomId,
  meId,
  myName,
  onEnd,
}: {
  title: string;
  accent: string;
  mode: "voice" | "video";
  roomId: string;
  meId: string;
  myName: string;
  onEnd: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [speaker, setSpeaker] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { mics, speakers, micId, speakerId, setMicId, setSpeakerId, refresh } = useAudioDevices();

  const { localStream, mediaError, participants, muted, camOn, setMuted, setCamOn } = useGroupCall({
    roomId,
    userId: meId,
    name: myName,
    mode,
    enabled: true,
    micId,
  });

  useEffect(() => {
    attachStream(videoRef.current, localStream);
  }, [localStream, camOn, minimized]);

  // Device labels only become readable once permission is granted.
  useEffect(() => {
    if (localStream) void refresh();
  }, [localStream, refresh]);

  useEffect(() => {
    const i = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(i);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEnd]);

  if (minimized) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-sidebar/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {mode === "video" ? "Video call" : "Voice call"} · {participants.length + 1} ·{" "}
              {formatDuration(seconds)}
            </p>
          </div>
          <button
            onClick={() => setMuted((v) => !v)}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          >
            {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
          <button
            onClick={() => setMinimized(false)}
            aria-label="Return to call"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            onClick={onEnd}
            aria-label="Leave call"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive text-destructive-foreground"
          >
            <PhoneOff className="size-4" />
          </button>
          <video ref={videoRef} autoPlay playsInline muted className="sr-only" />
          {participants.map((peer) => (
            <PeerAudio key={peer.userId} peer={peer} speaker={speaker} speakerId={speakerId} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${mode === "video" ? "Video" : "Voice"} call in ${title}`}
      className="fixed inset-0 z-[100] flex flex-col overscroll-none bg-sidebar pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-4 sm:flex-row">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <button
          onClick={() => setMinimized(true)}
          aria-label="Minimize call and keep chatting"
          className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          <ChevronDown className="size-4" />
          Back to chat
        </button>
        <div className="text-center">
          <h2 className="font-display text-lg font-semibold sm:text-xl">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "video" ? "Group video call" : "Group voice call"} · {participants.length + 1}{" "}
            {participants.length === 0 ? "person" : "people"} · {formatDuration(seconds)}
            {participants.length === 0 ? " · waiting for others…" : ""}
          </p>
          {mediaError ? (
            <p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground">{mediaError}</p>
          ) : null}
        </div>

        <div
          className={cn(
            "mx-auto mt-4 grid min-h-0 w-full max-w-3xl flex-1 gap-3 overflow-hidden",
            participants.length === 0 ? "max-w-sm grid-cols-1" : "grid-cols-2 lg:grid-cols-3",
          )}
        >
          <Tile name={`${myName} (you)`} accent={accent} muted={muted} showVideo={camOn}>
            <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
          </Tile>
          {participants.map((peer) => (
            <PeerTile key={peer.userId} peer={peer} speaker={speaker} speakerId={speakerId} />
          ))}
        </div>
      </div>
        {chatOpen ? (
          <CallChat roomId={roomId} meId={meId} onClose={() => setChatOpen(false)} />
        ) : null}
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
        <CallButton
          label={chatOpen ? "Hide call chat" : "Show call chat"}
          active={chatOpen}
          onClick={() => setChatOpen((v) => !v)}
        >
          <MessageSquare className="size-5" />
        </CallButton>
        <AudioDeviceMenu
          mics={mics}
          speakers={speakers}
          micId={micId}
          speakerId={speakerId}
          onMicChange={setMicId}
          onSpeakerChange={setSpeakerId}
          onOpen={() => void refresh()}
        />
        <button
          onClick={onEnd}
          aria-label="Leave call"
          className="grid size-16 place-items-center rounded-full bg-destructive text-destructive-foreground active:scale-95 sm:size-14"
        >
          <PhoneOff className="size-6 sm:size-5" />
        </button>
      </div>
    </div>
  );
}

function PeerTile({
  peer,
  speaker,
  speakerId,
}: {
  peer: CallPeer;
  speaker: boolean;
  speakerId: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    attachStream(ref.current, peer.stream);
    // Safari won't play audio from a hidden/unrendered video element, so remote
    // audio always goes through its own always-mounted <audio> element.
    attachStream(audioRef.current, peer.stream);
  }, [peer.stream]);

  useEffect(() => {
    applySinkId(audioRef.current, speakerId);
  }, [speakerId, peer.stream]);

  useEffect(() => {
    if (ref.current) ref.current.muted = true;
    if (audioRef.current) audioRef.current.muted = !speaker;
    if (!speaker) return;
    playWithUnlock(audioRef.current);
  }, [speaker, peer.stream]);

  // Android Chrome can drop the state broadcast, so trust live video tracks too.
  const videoTracks = peer.stream?.getVideoTracks() ?? [];
  const hasLiveVideo = videoTracks.some((t) => t.readyState === "live" && !t.muted);
  const hasVideo = videoTracks.length > 0 && (peer.camOn || hasLiveVideo);

  return (
    <Tile name={peer.name} accent={accentFor(peer.userId)} muted={peer.muted} showVideo={hasVideo}>
      <video ref={ref} autoPlay playsInline muted className="size-full object-cover" />
      <audio ref={audioRef} autoPlay className="hidden" />
    </Tile>
  );
}

/** Audio-only playback used while the call is minimized. */
function PeerAudio({
  peer,
  speaker,
  speakerId,
}: {
  peer: CallPeer;
  speaker: boolean;
  speakerId: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    attachStream(audioRef.current, peer.stream);
  }, [peer.stream]);

  useEffect(() => {
    applySinkId(audioRef.current, speakerId);
  }, [speakerId, peer.stream]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = !speaker;
    if (!speaker) return;
    playWithUnlock(audioRef.current);
  }, [speaker, peer.stream]);

  return <audio ref={audioRef} autoPlay className="hidden" />;
}

function Tile({
  name,
  accent,
  muted,
  showVideo,
  children,
}: {
  name: string;
  accent: string;
  muted: boolean;
  showVideo: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-secondary sm:aspect-square">
      <div className={showVideo ? "size-full" : "sr-only"}>{children}</div>
      {showVideo ? null : (
        <div className="grid size-full place-items-center">
          <Avatar name={name} accent={accent} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-background/85 to-transparent px-3 py-2">
        <span className="truncate text-[11px] font-medium">{name}</span>
        {muted ? <MicOff className="size-3 shrink-0 text-muted-foreground" /> : null}
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
