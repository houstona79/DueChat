import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mic2, Play, Trash2, Undo2 } from "lucide-react";
import { YahooSearchIcon } from "@/components/icons/YahooIcons";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/chat";
import { youtubeEmbedUrl } from "@/lib/chat";
import {
  addKaraokeSong,
  KARAOKE_PICKS,
  karaokeSearchUrl,
  markKaraokeSongPlayed,
  removeKaraokeSong,
  requeueKaraokeSong,
  type KaraokeSong,
} from "@/lib/karaoke";

export function KaraokePanel({
  roomId,
  meId,
  joined,
  canModerate,
  queue,
  profiles,
  nowPlayingUrl,
  onStage,
}: {
  roomId: string;
  meId: string;
  joined: boolean;
  canModerate: boolean;
  queue: KaraokeSong[];
  profiles: Profile[];
  nowPlayingUrl: string | null;
  onStage: (song: KaraokeSong) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [singer, setSinger] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upNext = queue.filter((s) => !s.played_at);
  const sung = queue.filter((s) => s.played_at).reverse();
  const nameOf = (userId: string) =>
    profiles.find((p) => p.id === userId)?.display_name ?? "Someone";

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["karaoke-queue", roomId] });

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await addKaraokeSong({
        roomId,
        userId: meId,
        title,
        artist,
        youtubeUrl: url,
        singerName: singer,
      });
      setTitle("");
      setArtist("");
      setUrl("");
      setSinger("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that song.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 p-4">
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Up next {upNext.length ? `(${upNext.length})` : ""}
        </h4>
        {upNext.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nobody in line yet — queue a YouTube karaoke track below.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {upNext.map((song, index) => {
              const live = nowPlayingUrl === song.youtube_url;
              const mine = song.user_id === meId;
              return (
                <li
                  key={song.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border border-border px-2.5 py-2",
                    live ? "border-primary/40 bg-primary/10" : "bg-card",
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-[11px] font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {song.title}
                      {song.artist ? (
                        <span className="font-normal text-muted-foreground"> — {song.artist}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {live ? "On stage now · " : ""}
                      Singer: {song.singer_name ?? nameOf(song.user_id)}
                    </p>
                  </div>
                  {canModerate ? (
                    <button
                      onClick={() => void onStage(song)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-primary hover:bg-secondary"
                      aria-label={`Put ${song.title} on stage`}
                      title="Put on stage"
                    >
                      <Play className="size-6" />
                    </button>
                  ) : null}
                  {canModerate ? (
                    <button
                      onClick={async () => {
                        await markKaraokeSongPlayed(song.id);
                        await refresh();
                      }}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                      aria-label={`Mark ${song.title} as sung`}
                      title="Mark as sung"
                    >
                      <Mic2 className="size-6" />
                    </button>
                  ) : null}
                  {mine || canModerate ? (
                    <button
                      onClick={async () => {
                        await removeKaraokeSong(song.id);
                        await refresh();
                      }}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                      aria-label={`Remove ${song.title}`}
                      title="Remove"
                    >
                      <Trash2 className="size-6" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Queue a song
        </h4>
        {joined ? (
          <div className="mt-2 space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              maxLength={120}
              className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Song title"
            />
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist (optional)"
              maxLength={80}
              className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Artist"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… (karaoke version)"
              inputMode="url"
              maxLength={500}
              className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              aria-label="YouTube karaoke link"
            />
            <input
              value={singer}
              onChange={(e) => setSinger(e.target.value)}
              placeholder="Singer name (optional)"
              maxLength={60}
              className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Singer name"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void submit()}
                disabled={busy || !title.trim() || !youtubeEmbedUrl(url.trim())}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add to queue"}
              </button>
              <a
                href={karaokeSearchUrl(title || "popular songs", artist)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground"
              >
                <YahooSearchIcon className="size-6" /> Find on YouTube
              </a>
            </div>
            {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Join the room to queue a song.</p>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Karaoke classics
        </h4>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Tap one to search YouTube karaoke versions, then paste the link above.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {KARAOKE_PICKS.map((pick) => (
            <a
              key={pick.title}
              href={karaokeSearchUrl(pick.title, pick.artist)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setTitle(pick.title);
                setArtist(pick.artist);
              }}
              className="rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              {pick.title}
            </a>
          ))}
        </div>
      </section>

      {sung.length ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Already sung
          </h4>
          <ul className="mt-2 space-y-1.5">
            {sung.map((song) => (
              <li
                key={song.id}
                className="flex items-center gap-2 rounded-xl border border-border/60 px-2.5 py-2 opacity-70"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{song.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {song.singer_name ?? nameOf(song.user_id)}
                  </p>
                </div>
                {song.user_id === meId || canModerate ? (
                  <button
                    onClick={async () => {
                      await requeueKaraokeSong(song.id);
                      await refresh();
                    }}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                    aria-label={`Queue ${song.title} again`}
                    title="Sing again"
                  >
                    <Undo2 className="size-6" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
