import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Music2, Pause, Play, Radio, Settings2, Volume2, X } from "lucide-react";
import { isValidRadioUrl, spotifyEmbedUrl } from "@/lib/chat";
import { getNowPlaying } from "@/lib/radio-meta.functions";
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
  const [licensed, setLicensed] = useState(false);

  const fetchNowPlaying = useServerFn(getNowPlaying);
  const spotifyUrl = spotifyEmbedUrl(url);
  const { data: nowPlaying } = useQuery({
    queryKey: ["radio-now-playing", url],
    queryFn: () => fetchNowPlaying({ data: { url: url! } }),
    enabled: !!url && !spotifyUrl,
    refetchInterval: playing ? 20_000 : 60_000,
    staleTime: 15_000,
    retry: false,
  });
  const artist = nowPlaying?.artist ?? null;
  const track = nowPlaying?.title ?? null;

  useEffect(() => {
    setDraftUrl(url ?? "");
    setDraftName(name ?? "");
    setPlaying(false);
    setError(null);
    setLicensed(false);
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
      // Cache-bust so a previously failed/stalled stream retries cleanly.
      if (el.error || el.readyState === 0) {
        el.src = url ?? "";
        el.load();
      }
      el.volume = volume;
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError(
        /\.(m3u8?|pls|asx)(\?|$)/i.test(url ?? "")
          ? "Playlist links (.m3u/.pls) can't play directly — use the raw stream link (usually ends in /stream, .mp3 or .aac)."
          : "Could not play this station. The stream may be offline or blocking playback in the browser.",
      );
    }
  };

  const save = async (clear = false) => {
    setError(null);
    const nextUrl = clear ? null : draftUrl.trim();
    if (nextUrl && !isValidRadioUrl(nextUrl)) {
      setError("Enter a full https:// stream link.");
      return;
    }
    if (nextUrl && !licensed) {
      setError("Confirm the station is properly licensed before adding it.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        url: nextUrl || null,
        name: nextUrl ? draftName.trim().slice(0, 60) || null : null,
      });
      setEditing(false);
      setLicensed(false);
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
            playing && !spotifyUrl
              ? "bg-primary/20 text-primary"
              : "bg-secondary text-muted-foreground",
          )}
        >
          <Radio className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            {url ? (name ?? (spotifyUrl ? "Spotify playlist" : "Room radio")) : "No station yet"}
          </p>
          {url && spotifyUrl ? (
            <p className="truncate text-[11px] text-muted-foreground">
              Playing from Spotify — sign in to Spotify for full tracks
            </p>
          ) : url && track ? (
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <Music2 className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {artist ? (
                  <>
                    <span className="font-medium text-foreground">{artist}</span>
                    {" — "}
                    {track}
                  </>
                ) : (
                  track
                )}
              </span>
            </p>
          ) : (
            <p className="truncate text-[11px] text-muted-foreground">
              {url
                ? playing
                  ? "Playing live"
                  : "Tap play to listen"
                : "Add a stream or Spotify playlist link"}
            </p>
          )}
        </div>

        {url && !spotifyUrl ? (
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
          <div className="rounded-xl bg-secondary/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Station rules</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>
                The station must be properly licensed for public broadcast (e.g. SoundExchange,
                ASCAP/BMI/SESAC, PRS, or an equivalent).
              </li>
              <li>
                Only add streams you own or have permission to rebroadcast — no pirated or
                unlicensed feeds.
              </li>
              <li>Adults-only or explicit stations are not allowed in G-rated rooms.</li>
              <li>
                Unlicensed stations may be removed and the room owner may lose radio privileges.
              </li>
            </ul>
          </div>
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://stream.example.com/live.mp3 or Spotify playlist link"
            inputMode="url"
            maxLength={500}
            className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Radio stream or Spotify playlist URL"
          />
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Station name (optional)"
            maxLength={60}
            className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Station name"
          />
          <label className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={licensed}
              onChange={(e) => setLicensed(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              I confirm this station is properly licensed and I have the right to play it in this
              room.
            </span>
          </label>
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

      {spotifyUrl ? (
        <iframe
          src={spotifyUrl}
          title={name ?? "Spotify player"}
          className="mt-2 w-full rounded-xl"
          height={152}
          frameBorder={0}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          onError={() => {
            setPlaying(false);
            setError("Stream is unavailable or blocked. Try another station link.");
          }}
          onPause={() => setPlaying(false)}
          onPlaying={() => setPlaying(true)}
          className="hidden"
        />
      ) : null}
    </section>
  );
}
