import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/messenger/Avatar";
import { useAuth, useMyProfile } from "@/hooks/use-auth";
import { accentFor, normalizeWebsiteUrl, updateProfile, uploadAvatar } from "@/lib/chat";
import { isRedish } from "@/hooks/use-roles";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";

const NAME_COLORS = [
  { label: "Default", value: "" },
  { label: "Electric blue", value: "#4c8dff" },
  { label: "Cyan", value: "#22d3ee" },
  { label: "Mint", value: "#34d399" },
  { label: "Lime", value: "#a3e635" },
  { label: "Amber", value: "#fbbf24" },
  { label: "Orange", value: "#fb923c" },
  { label: "Pink", value: "#f472b6" },
  { label: "Violet", value: "#a78bfa" },
  { label: "Indigo", value: "#818cf8" },
  { label: "Slate", value: "#cbd5e1" },
];

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Your profile — DueChat" },
      { name: "description", content: "Update your display name, handle, photo and status." },
      { property: "og:title", content: "Your profile — DueChat" },
      {
        property: "og:description",
        content: "Update your display name, handle, photo and status.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { data: me } = useMyProfile(user?.id);
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [nameColor, setNameColor] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    setDisplayName(me.display_name);
    setUsername(me.username);
    setStatus(me.status_message ?? "");
    setNameColor(me.name_color ?? "");
    setBirthDate(me.birth_date ?? "");
    setCountry(me.country ?? "");
    setBio(me.bio ?? "");
    setWebsite(me.website_url ?? "");
  }, [me]);

  if (!user || !me) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (nameColor && isRedish(nameColor)) {
        setMessage("Red name colors are reserved for admins — pick another color.");
        setBusy(false);
        return;
      }
      const websiteUrl = website.trim() ? normalizeWebsiteUrl(website) : null;
      if (website.trim() && !websiteUrl) {
        setMessage("That link doesn't look right — try something like https://example.com");
        setBusy(false);
        return;
      }
      await updateProfile(user.id, {
        display_name: displayName.trim().slice(0, 60) || me.display_name,
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) || me.username,
        status_message: status.trim().slice(0, 120) || null,
        name_color: nameColor || null,
        country: country || null,
        bio: bio.trim().slice(0, 500) || null,
        website_url: websiteUrl,
        ...(me.birth_date ? {} : { birth_date: birthDate || null }),
      });
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setMessage("Please pick an image under 4 MB.");
      return;
    }
    setBusy(true);
    try {
      await uploadAvatar(user.id, file);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setMessage("Photo updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-8">
      <Link
        to="/chat"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to rooms
      </Link>
      <h1 className="mt-6 text-2xl font-semibold">Your profile</h1>

      <div className="mt-6 flex items-center gap-4">
        <Avatar
          name={me.display_name}
          accent={accentFor(me.id)}
          avatarPath={me.avatar_url}
          size="lg"
        />
        <label className="cursor-pointer rounded-xl bg-secondary px-3 py-2 text-sm">
          Change photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
        </label>
      </div>

      <form onSubmit={save} className="mt-6 space-y-4">
        <Field label="Display name" id="display-name" value={displayName} onChange={setDisplayName} />
        <Field label="Username" id="username" value={username} onChange={setUsername} />
        <Field label="Status" id="status" value={status} onChange={setStatus} placeholder="Working on something new" />

        <div>
          <label htmlFor="bio" className="block text-[11px] font-medium text-muted-foreground">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            maxLength={500}
            rows={4}
            placeholder="Tell people a bit about you"
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 w-full resize-y rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <p className="mt-1 text-[11px] text-muted-foreground/80">{bio.length}/500</p>
        </div>

        <Field
          label="Website or link"
          id="website"
          value={website}
          onChange={setWebsite}
          placeholder="https://example.com"
        />

        <div>
          <span className="block text-[11px] font-medium text-muted-foreground">Date of birth</span>
          {me.birth_date ? (
            <p className="mt-1 text-sm">
              {me.birth_date}{" "}
              <span className="text-[11px] text-muted-foreground">
                · locked (used for age-restricted rooms)
              </span>
            </p>
          ) : (
            <>
              <input
                id="birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                Required to enter R-rated (18+) rooms. You can only set this once.
              </p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="country" className="block text-[11px] font-medium text-muted-foreground">
            Country
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
          >
            <option value="">Not set</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-muted-foreground">Name color</span>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            Red is reserved for admins.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {NAME_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setNameColor(c.value)}
                aria-label={c.label}
                aria-pressed={nameColor === c.value}
                className={cn(
                  "size-9 rounded-full border-2 bg-secondary text-[10px] font-semibold",
                  nameColor === c.value ? "border-primary" : "border-transparent",
                )}
                style={c.value ? { backgroundColor: c.value } : undefined}
              >
                {c.value ? "" : "A"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm">
            Preview:{" "}
            <span
              className="font-semibold"
              style={nameColor ? { color: nameColor } : undefined}
            >
              {displayName || me.display_name}
            </span>
          </p>
        </div>

        {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
