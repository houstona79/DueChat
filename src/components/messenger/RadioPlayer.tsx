import { useEffect, useRef, useState } from "react";
import { Pause, Play, Radio, Settings2, Volume2, X } from "lucide-react";
import { isValidRadioUrl } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function RadioPlayer({
  url,
  name,
  canEdit,
  onSave,
}: {
  url: string | null;
  name: string | null;
  canEdit: boolean;
  onSave: (radio: { url: string | null; name: string | null }) => Promise<void>;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(url ?? "");
  const [draftName, setDraftName] = useState(name ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraftUrl(url ?? "");
    setDraftName(name ?? "");
    setPlaying(false);
    setError(null);
  }, [url, name]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, url]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    setError(null);
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    try {
      el.load();
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError("Could not play this station. Check the stream link.");
    }
  };

  const save = async (clear = false) => {
    setError(null);
    const nextUrl = clear ? null : draftUrl.trim();
    if (nextUrl && !isValidRadioUrl(nextUrl)) {
      setError("Enter a full https:// stream link.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        url: nextUrl || null,
        name: nextUrl ? draftName.trim().slice(0, 60) || null : null,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the station.");
    } finally {
      setBusy(false);
    }
  };

  if (!url && !canEdit) return null;

  return (
    <section className="border-b border-border/60 bg-secondary/30 px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-xl",
            playing ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground",
          )}
        >
          <Radio className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            {url ? (name ?? "Room radio") : "No station yet"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {url ? (playing ? "Playing live" : "Tap play to listen") : "Add a stream link to play music"}
          </p>
        </div>

        {url ? (
          <>
            <button
              onClick={() => void toggle()}
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
              aria-label={playing ? "Pause radio" : "Play radio"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <label className="hidden items-center gap-1.5 sm:flex">
              <Volume2 className="size-4 text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Radio volume"
                className="w-20 accent-primary"
              />
            </label>
          </>
        ) : null}

        {canEdit ? (
          <button
            onClick={() => setEditing((v) => !v)}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            aria-label={editing ? "Close radio settings" : "Set radio station"}
          >
            {editing ? <X className="size-4" /> : <Settings2 className="size-4" />}
          </button>
        ) : null}
      </div>

      {editing && canEdit ? (
        <div className="mt-2 space-y-2">
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://stream.example.com/live.mp3"
            inputMode="url"
            maxLength={500}
            className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Radio stream URL"
          />
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Station name (optional)"
            maxLength={60}
            className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Station name"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={busy}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save station"}
            </button>
            {url ? (
              <button
                onClick={() => void save(true)}
                disabled={busy}
                className="rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-1.5 text-[11px] text-destructive">{error}</p> : null}

      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          crossOrigin="anonymous"
          onError={() => {
            if (playing) setError("Stream stopped or is unavailable.");
            setPlaying(false);
          }}
          onPause={() => setPlaying(false)}
          onPlaying={() => setPlaying(true)}
          className="hidden"
        />
      ) : null}
    </section>
  );
}