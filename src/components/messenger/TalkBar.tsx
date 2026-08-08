import { Hand, Mic, MicOff, PhoneOff, Radio, Video, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGroupCall, type CallPeer } from "@/hooks/use-group-call";
import { attachStream, playWithUnlock, unlockAudioPlayback } from "@/lib/webrtc";
import { applySinkId, useAudioDevices } from "@/lib/audio-devices";
import { useMicLevel } from "@/lib/use-mic-level";
import { AudioDeviceMenu } from "./AudioDeviceMenu";
import { MicLevelMeter } from "./MicLevelMeter";
import { CamPanel } from "./CamPanel";
import { sendMessage } from "@/lib/chat";
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
  camsOpen,
  onCamsOpenChange,
}: {
  roomId: string;
  meId: string;
  myName: string;
  onLeave: () => void;
  camsOpen: boolean;
  onCamsOpenChange: (open: boolean) => void;
}) {
  const [held, setHeld] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("duechat:ptt") !== "false";
  });
  const [speaker, setSpeaker] = useState(true);
  const { mics, speakers, micId, speakerId, setMicId, setSpeakerId, refresh } = useAudioDevices();

  const queryClient = useQueryClient();

  const { localStream, mediaError, participants, camOn, setCamOn, setMuted } = useGroupCall({
    roomId,
    userId: meId,
    name: myName,
    mode: "voice",
    enabled: true,
    micId,
  });

  // Announce camera changes in the room timeline as a system-style notice.
  const announcedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (announcedRef.current === camOn) return;
    const first = announcedRef.current === null;
    announcedRef.current = camOn;
    if (first && !camOn) return;
    void (async () => {
      try {
        await sendMessage(roomId, meId, camOn ? "::live::on" : "::live::off");
        await queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
      } catch {
        /* notice is best-effort */
      }
    })();
  }, [camOn, roomId, meId, queryClient]);

  const liveCams = participants.filter((p) => {
    const tracks = p.stream?.getVideoTracks() ?? [];
    return tracks.length > 0 && (p.camOn || tracks.some((t) => t.readyState === "live" && !t.muted));
  }).length;

  const micLevel = useMicLevel(localStream, true);

  // Labels only become readable once mic permission is granted.
  useEffect(() => {
    if (localStream) void refresh();
  }, [localStream, refresh]);

  const live = pushToTalk ? held : true;

  // Older Safari (and some Mac keyboard layouts) report the space bar as
  // "Spacebar" or only expose keyCode, so accept every known spelling.
  const isSpaceKey = (e: KeyboardEvent | React.KeyboardEvent) =>
    e.key === " " ||
    e.key === "Spacebar" ||
    (e as KeyboardEvent).code === "Space" ||
    (e as KeyboardEvent).keyCode === 32;

  // Global keyboard shortcut: hold Space to talk. Ignore while typing in
  // editable fields so the chat input still works normally.
  useEffect(() => {
    if (!pushToTalk) return;

    const isTyping = () => {
      const active = document.activeElement;
      if (!active) return false;
      const htmlEl = active as HTMLElement;
      return (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.getAttribute("contenteditable") === "true" ||
        htmlEl.isContentEditable
      );
    };

    const keyDown = (e: KeyboardEvent) => {
      if (!isSpaceKey(e) || held) return;
      if (isTyping()) return;
      e.preventDefault();
      unlockAudioPlayback();
      setHeld(true);
    };

    const keyUp = (e: KeyboardEvent) => {
      if (!isSpaceKey(e)) return;
      setHeld(false);
    };

    const release = () => setHeld(false);

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [held, pushToTalk]);

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
    // Older Safari on macOS has no Pointer Events — mouse events are the
    // only reliable release signal there.
    window.addEventListener("mouseup", release);
    window.addEventListener("touchend", release);
    window.addEventListener("touchcancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("mouseup", release);
      window.removeEventListener("touchend", release);
      window.removeEventListener("touchcancel", release);
      window.removeEventListener("blur", release);
    };
  }, [held]);

  return (
    <>
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
          if (isSpaceKey(e) || e.key === "Enter") press();
        }}
        onKeyUp={(e) => {
          if (isSpaceKey(e) || e.key === "Enter") setHeld(false);
        }}
        aria-label={
          pushToTalk ? (live ? "Microphone open" : "Hold to talk") : "Microphone always open"
        }
        aria-pressed={live}
        title={pushToTalk ? "Hold Space or click to talk" : "Open microphone mode"}
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

      <MicLevelMeter level={micLevel} active={live} />

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
        onClick={() => onCamsOpenChange(!camsOpen)}
        aria-label="Show room cameras"
        aria-pressed={camsOpen}
        title="Cams"
        className={cn(
          "flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold",
          camsOpen || camOn ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
        )}
      >
        <Video className="size-4" />
        Cams{liveCams + (camOn ? 1 : 0) > 0 ? ` ${liveCams + (camOn ? 1 : 0)}` : ""}
      </button>

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

    <CamPanel
        open={camsOpen}
        onClose={() => onCamsOpenChange(false)}
        myName={myName}
        myStream={localStream}
        camOn={camOn}
        onToggleCam={() => setCamOn((v) => !v)}
        participants={participants}
      />
    </>
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
