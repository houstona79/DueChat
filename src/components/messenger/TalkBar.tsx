import { Hand, Mic, MicOff, PhoneOff, Radio, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGroupCall, type CallPeer } from "@/hooks/use-group-call";
import { attachStream, playWithUnlock, unlockAudioPlayback } from "@/lib/webrtc";
import { applySinkId, useAudioDevices } from "@/lib/audio-devices";
import { AudioDeviceMenu } from "./AudioDeviceMenu";
import { cn } from "@/lib/utils";

/**
 * Always-on room audio bar with a push-to-talk toggle.
 *
 * Tap the toggle to switch between "push-to-talk" (hold the talk button to
 * speak) and "open mic" (microphone stays live). The chosen mode persists
 * across visits in localStorage.
 */
export function TalkBar({
  roomId,
  meId,
  myName,
  onLeave,
}: {
  roomId: string;
  meId: string;
  myName: string;
  onLeave: () => void;
}) {
  const [held, setHeld] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("duechat:ptt") !== "false";
  });
  const [speaker, setSpeaker] = useState(true);
  const { mics, speakers, micId, speakerId, setMicId, setSpeakerId, refresh } = useAudioDevices();

  const { localStream, mediaError, participants, setMuted } = useGroupCall({
    roomId,
    userId: meId,
    name: myName,
    mode: "voice",
    enabled: true,
    micId,
  });

  // Labels only become readable once mic permission is granted.
  useEffect(() => {
    if (localStream) void refresh();
  }, [localStream, refresh]);

  const live = pushToTalk ? held || openMic : true;

  // iOS Safari: pointer events can be missing/unreliable on older versions, so
  // accept touch and mouse too, and unlock audio output inside the gesture.
  const press = () => {
    unlockAudioPlayback();
    setHeld(true);
  };

  // Keep the real mic state in sync, including once media resolves.
  useEffect(() => {
    setMuted(!live);
  }, [live, localStream, setMuted]);

  // Releasing outside the button must still close the mic.
  useEffect(() => {
    if (!held) return;
    const release = () => setHeld(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [held]);

  return (
    <section
      aria-label="Room voice"
      className="relative flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-sidebar/70 px-3 py-2"
    >
      <button
        type="button"
        onPointerDown={press}
        onTouchStart={(e) => {
          e.preventDefault();
          press();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          setHeld(false);
        }}
        onTouchCancel={() => setHeld(false)}
        onMouseDown={press}
        onMouseUp={() => setHeld(false)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") press();
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") setHeld(false);
        }}
        aria-label={
          pushToTalk
            ? live
              ? "Microphone open"
              : "Hold to talk"
            : "Microphone always open"
        }
        aria-pressed={live}
        className={cn(
          "flex h-11 touch-none select-none items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors active:scale-95 [-webkit-touch-callout:none] [-webkit-user-select:none]",
          live
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground hover:bg-secondary/80",
          !pushToTalk && "cursor-default",
        )}
      >
        {live ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        {live ? "On air" : pushToTalk ? "Hold to talk" : "Mic open"}
      </button>

      <button
        type="button"
        onClick={() => {
          unlockAudioPlayback();
          setPushToTalk((v) => {
            const next = !v;
            if (typeof window !== "undefined") {
              window.localStorage.setItem("duechat:ptt", String(next));
            }
            return next;
          });
        }}
        aria-label={pushToTalk ? "Switch to open microphone" : "Switch to push-to-talk"}
        aria-pressed={pushToTalk}
        className={cn(
          "grid size-10 place-items-center rounded-xl",
          pushToTalk ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
        )}
        title={pushToTalk ? "Push-to-talk on" : "Open mic on"}
      >
        {pushToTalk ? <Hand className="size-4" /> : <Radio className="size-4" />}
      </button>

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
        type="button"
        onClick={() => setSpeaker((v) => !v)}
        aria-label={speaker ? "Mute room sound" : "Unmute room sound"}
        aria-pressed={speaker}
        className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
      >
        {speaker ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </button>

      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {mediaError ??
          (participants.length === 0
            ? "You're on the mic — waiting for others to join."
            : `${participants.length + 1} on the mic${
                participants.filter((p) => !p.muted).length > 0
                  ? ` · ${participants
                      .filter((p) => !p.muted)
                      .map((p) => p.name)
                      .join(", ")} talking`
                  : ""
              }`)}
      </p>

      <button
        type="button"
        onClick={onLeave}
        aria-label="Leave room voice"
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive text-destructive-foreground"
      >
        <PhoneOff className="size-4" />
      </button>

      {participants.map((peer) => (
        <PeerAudio key={peer.userId} peer={peer} speaker={speaker} speakerId={speakerId} />
      ))}
    </section>
  );
}

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

  // iOS Safari refuses to play audio from an element with display:none.
  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      className="pointer-events-none absolute size-px opacity-0"
      aria-hidden="true"
    />
  );
}
