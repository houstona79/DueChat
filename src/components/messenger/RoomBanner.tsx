import { useEffect, useState } from "react";
import { ExternalLink, ImagePlus, Pencil, X } from "lucide-react";
import { isHttpsUrl, type RoomBranding } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function RoomBanner({
  roomName,
  branding,
  canEdit,
  onSave,
}: {
  roomName: string;
  branding: RoomBranding;
  canEdit: boolean;
  onSave: (next: RoomBranding) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [icon, setIcon] = useState(branding.icon_url ?? "");
  const [banner, setBanner] = useState(branding.banner_url ?? "");
  const [site, setSite] = useState(branding.website_url ?? "");
  const [label, setLabel] = useState(branding.website_label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIcon(branding.icon_url ?? "");
    setBanner(branding.banner_url ?? "");
    setSite(branding.website_url ?? "");
    setLabel(branding.website_label ?? "");
  }, [branding.icon_url, branding.banner_url, branding.website_url, branding.website_label]);

  const hasBranding = Boolean(branding.banner_url || branding.icon_url || branding.website_url);
  if (!hasBranding && !canEdit) return null;

  const save = async () => {
    setError(null);
    for (const [value, name] of [
      [icon, "icon"],
      [banner, "banner"],
      [site, "website"],
    ] as const) {
      if (value.trim() && !isHttpsUrl(value)) {
        setError(`The ${name} link must be a full https:// URL.`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({
        icon_url: icon.trim() || null,
        banner_url: banner.trim() || null,
        website_url: site.trim() || null,
        website_label: label.trim().slice(0, 60) || null,
      });
      setEditing(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err && typeof err.message === "string"
            ? err.message
            : "Could not save the room branding.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-b border-border" aria-label={`${roomName} branding`}>
      {branding.banner_url || branding.icon_url ? (
        <div className="relative">
          {branding.banner_url ? (
            <img
              src={branding.banner_url}
              alt={`${roomName} banner`}
              loading="lazy"
              className="h-24 w-full object-cover sm:h-32"
            />
          ) : (
            <div className="h-16 w-full bg-secondary sm:h-20" />
          )}
          <div className="flex items-end gap-3 px-3 pb-2 sm:px-4">
            {branding.icon_url ? (
              <img
                src={branding.icon_url}
                alt={`${roomName} icon`}
                loading="lazy"
                className="-mt-6 size-12 shrink-0 rounded-2xl border-2 border-background object-cover sm:size-14"
              />
            ) : null}
            <div className="min-w-0 flex-1 pt-2">
              <p className="truncate text-sm font-semibold">{roomName}</p>
              {branding.website_url ? (
                <a
                  href={branding.website_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {branding.website_label || branding.website_url.replace(/^https:\/\//, "")}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </div>
            {canEdit ? (
              <button
                onClick={() => setEditing((v) => !v)}
                className="mb-1 grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
                aria-label={editing ? "Close room branding editor" : "Edit room icon and banner"}
                aria-expanded={editing}
              >
                {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
              </button>
            ) : null}
          </div>
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
          <button
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            aria-expanded={editing}
          >
            <ImagePlus className="size-4" aria-hidden />
            Add room icon, banner &amp; website
          </button>
        </div>
      ) : null}

      {editing && canEdit ? (
        <div className="grid gap-2 px-3 pb-3 sm:px-4">
          {(
            [
              ["Room icon image URL", icon, setIcon, "https://example.com/icon.png"],
              ["Room banner image URL", banner, setBanner, "https://example.com/banner.jpg"],
              ["Website link", site, setSite, "https://example.com"],
              ["Website link text", label, setLabel, "Visit our site"],
            ] as const
          ).map(([lbl, value, setter, placeholder]) => (
            <label key={lbl} className="grid gap-1 text-xs text-muted-foreground">
              {lbl}
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                maxLength={lbl === "Website link text" ? 60 : 500}
                className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          ))}
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={saving}
              className={cn(
                "rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground",
                saving && "opacity-60",
              )}
            >
              {saving ? "Saving…" : "Save branding"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
