import { Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { canChooseSpeaker, type AudioDevice } from "@/lib/audio-devices";
import { cn } from "@/lib/utils";

/** Small popover for picking which mic records and which speaker plays. */
export function AudioDeviceMenu({
  mics,
  speakers,
  micId,
  speakerId,
  onMicChange,
  onSpeakerChange,
  onOpen,
}: {
  mics: AudioDevice[];
  speakers: AudioDevice[];
  micId: string;
  speakerId: string;
  onMicChange: (id: string) => void;
  onSpeakerChange: (id: string) => void;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sinkSupported = canChooseSpeaker();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectClass =
    "w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((v) => !v);
        }}
        aria-label="Audio device settings"
        aria-expanded={open}
        title="Mic & speaker"
        className={cn(
          "grid size-10 place-items-center rounded-xl",
          open ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
        )}
      >
        <Settings2 className="size-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-64 space-y-3 rounded-2xl border border-border bg-popover p-3 text-left shadow-xl">
          <div className="space-y-1">
            <label htmlFor="audio-mic" className="text-[11px] font-semibold text-muted-foreground">
              Microphone
            </label>
            <select
              id="audio-mic"
              value={micId}
              onChange={(e) => onMicChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Default microphone</option>
              {mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="audio-out" className="text-[11px] font-semibold text-muted-foreground">
              Speaker
            </label>
            <select
              id="audio-out"
              value={speakerId}
              onChange={(e) => onSpeakerChange(e.target.value)}
              disabled={!sinkSupported}
              className={cn(selectClass, !sinkSupported && "opacity-60")}
            >
              <option value="">Default speaker</option>
              {speakers.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
            {!sinkSupported && (
              <p className="text-[11px] text-muted-foreground">
                This browser picks the speaker from your system settings.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
