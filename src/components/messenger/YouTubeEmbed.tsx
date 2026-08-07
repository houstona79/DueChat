import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Settings2, X, Youtube } from "lucide-react";
import { youtubeEmbedUrl } from "@/lib/chat";

export function YouTubeEmbed({
  url,
  title,
  canEdit,
  onSave,
}: {
  url: string | null;
  title: string | null;
  canEdit: boolean;
  onSave: (video: { url: string | null; title: string | null }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(true);
  const [draftUrl, setDraftUrl] = useState(url ?? "");
  const [draftTitle, setDraftTitle] = useState(title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraftUrl(url ?? "");
    setDraftTitle(title ?? "");
    setError(null);
  }, [url, title]);

  const embed = url ? youtubeEmbedUrl(url) : null;

  const save = async (clear = false) => {
    setError(null);
    const nextUrl = clear ? "" : draftUrl.trim();
    if (nextUrl && !youtubeEmbedUrl(nextUrl)) {
      setError("Paste a YouTube video, Shorts, live, or playlist link.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        url: nextUrl || null,
        title: nextUrl ? draftTitle.trim().slice(0, 80) || null : null,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the video.");
    } finally {
      setBusy(false);
    }
  };

  if (!url && !canEdit) return null;

  return (
    <section className="border-b border-border/60 bg-secondary/30 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
          <Youtube className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            {embed ? (title ?? "Room video") : url ? "Unsupported link" : "No video yet"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {embed ? "Watching together" : "Add a YouTube link to watch in this room"}
          </p>
        </div>
        {embed ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            aria-label={open ? "Hide video" : "Show video"}
          >
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        ) : null}
        {canEdit ? (
          <button
            onClick={() => setEditing((v) => !v)}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            aria-label={editing ? "Close video settings" : "Set room video"}
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
            placeholder="https://www.youtube.com/watch?v=…"
            inputMode="url"
            maxLength={500}
            className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="YouTube link"
          />
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Video title (optional)"
            maxLength={80}
            className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Video title"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={busy}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save video"}
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

      {embed && open ? (
        <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={embed}
            title={title ?? "Room video"}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : null}
    </section>
  );
}