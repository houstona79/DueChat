import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/messenger/Avatar";
import { ProfilePhotos } from "@/components/messenger/ProfilePhotos";
import { ProfileFeed } from "@/components/messenger/ProfileFeed";
import { InviteCard } from "@/components/messenger/InviteCard";
import { BlockList } from "@/components/messenger/BlockList";
import { AccessibilitySettings } from "@/components/system/AccessibilitySettings";
import { LanguageSettings } from "@/components/system/LanguageSettings";
import { ImageCropper } from "@/components/messenger/ImageCropper";
import { useAuth, useMyProfile } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { accentFor, MAIL_DOMAIN, normalizeWebsiteUrl, updateProfile, uploadAvatar } from "@/lib/chat";
import { isRedish, readableNameColor } from "@/hooks/use-roles";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { GENDERS } from "@/lib/genders";
import { FIELD_VISIBILITIES } from "@/lib/field-visibility";
import { DECORATIONS } from "@/lib/decorations";
import { postStatusChangeUpdate } from "@/lib/profile-updates";
import { syncMyMailRoute } from "@/lib/mail-routing.functions";

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

const PROFILE_VISIBILITIES = [
  { value: "public", label: "Everyone" },
  { value: "buddies", label: "Buddies only" },
  { value: "private", label: "Private — nobody" },
] as const;

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
  const [gender, setGender] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [genderVisibility, setGenderVisibility] = useState("public");
  const [pronounsVisibility, setPronounsVisibility] = useState("public");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [mailHandle, setMailHandle] = useState("");
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [decoration, setDecoration] = useState("");
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (!me) return;
    setDisplayName(me.display_name);
    setUsername(me.username);
    setStatus(me.status_message ?? "");
    setNameColor(me.name_color ?? "");
    setBirthDate(me.birth_date ?? "");
    setCountry(me.country ?? "");
    setGender(me.gender ?? "");
    setPronouns(me.pronouns ?? "");
    setGenderVisibility(me.gender_visibility ?? "public");
    setPronounsVisibility(me.pronouns_visibility ?? "public");
    setBio(me.bio ?? "");
    setWebsite(me.website_url ?? "");
    setMailHandle(me.mail_handle ?? "");
    setProfileVisibility(me.profile_visibility ?? "public");
    setDecoration(me.decoration ?? "");
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
      const nextStatus = status.trim().slice(0, 120) || null;
      const handle = mailHandle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "");
      if (handle && !/^[a-z0-9][a-z0-9._-]{2,23}$/.test(handle)) {
        setMessage(
          "Mail handles are 3–24 characters and can use letters, numbers, dots, dashes and underscores.",
        );
        setBusy(false);
        return;
      }
      const statusChanged = nextStatus !== (me.status_message ?? null);
      const handleChanged = (handle || null) !== (me.mail_handle ?? null);
      await updateProfile(user.id, {
        display_name: displayName.trim().slice(0, 60) || me.display_name,
        username:
          username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 24) || me.username,
        status_message: nextStatus,
        name_color: nameColor || null,
        country: country || null,
        gender: gender || null,
        pronouns: pronouns.trim().slice(0, 40) || null,
        gender_visibility: genderVisibility,
        pronouns_visibility: pronounsVisibility,
        bio: bio.trim().slice(0, 500) || null,
        website_url: websiteUrl,
        mail_handle: handle || null,
        profile_visibility: profileVisibility,
        decoration: decoration || null,
        ...(me.birth_date ? {} : { birth_date: birthDate || null }),
      });
      if (statusChanged && nextStatus) {
        try {
          await postStatusChangeUpdate(user.id, nextStatus);
          await queryClient.invalidateQueries({ queryKey: ["profile-updates", user.id] });
          await queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        } catch {
          // Status saved; the feed entry is best-effort.
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      let routeNote = "";
      if (handleChanged) {
        try {
          const res = await syncMyMailRoute();
          if (res.synced && handle) routeNote = ` Mail forwarding for ${handle}@${MAIL_DOMAIN} is live.`;
          else if (!res.synced)
            routeNote =
              res.reason === "address_taken"
                ? " That mail address already has a forwarding rule — pick another handle."
                : ` Saved, but mail forwarding wasn't updated: ${res.message ?? "forwarding isn't connected yet."}`;
        } catch {
          routeNote = " Saved, but mail forwarding couldn't be updated right now.";
        }
      }
      setMessage(
        (
        statusChanged && nextStatus
          ? "Profile saved — status shared to your feed."
          : "Profile saved."
        ) + routeNote,
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setMessage(
        /mail_handle/i.test(raw)
          ? "That mail handle is already taken — try another."
          : raw || "Could not save profile.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please pick an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMessage("Please pick an image under 4 MB.");
      return;
    }
    setMessage(null);
    setAvatarFile(file);
  };

  const saveAvatar = async (file: File) => {
    setBusy(true);
    try {
      await uploadAvatar(user.id, file);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setMessage("Photo updated.");
      setAvatarFile(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      id="main-content"
      className="mx-auto min-h-screen min-w-0 max-w-3xl px-3 py-6 sm:px-5 sm:py-8"
    >
      <Link
        to="/chat"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to rooms
      </Link>
      <h1 className="mt-6 text-2xl font-semibold">Your profile</h1>

      <div id="accessibility" className="mt-6 scroll-mt-6">
        <AccessibilitySettings />
      </div>

      <div id="language" className="mt-6 scroll-mt-6">
        <LanguageSettings />
      </div>

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

      {avatarFile ? (
        <ImageCropper
          file={avatarFile}
          busy={busy}
          onCancel={() => setAvatarFile(null)}
          onDone={(cropped) => void saveAvatar(cropped)}
        />
      ) : null}

      <form onSubmit={save} className="mt-6 space-y-4">
        <Field
          label="Display name"
          id="display-name"
          value={displayName}
          onChange={setDisplayName}
        />
        <Field label="Username" id="username" value={username} onChange={setUsername} />
        <Field
          label="Status"
          id="status"
          value={status}
          onChange={setStatus}
          placeholder="Working on something new"
        />

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
          <p className="mt-1 text-[11px] text-muted-foreground">{bio.length}/500</p>
        </div>

        <Field
          label="Website or link"
          id="website"
          value={website}
          onChange={setWebsite}
          placeholder="https://example.com"
        />

        <div>
          <label
            htmlFor="mail-handle"
            className="block text-[11px] font-medium text-muted-foreground"
          >
            Your {MAIL_DOMAIN} mail handle
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <input
              id="mail-handle"
              value={mailHandle}
              maxLength={24}
              placeholder="yourname"
              onChange={(e) => setMailHandle(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="shrink-0 text-sm text-muted-foreground">@{MAIL_DOMAIN}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Shown on your profile so people can reach you. Mail sent here forwards to the inbox you
            set up with your address — DueChat doesn't host the mailbox.
          </p>
        </div>

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
              <p className="mt-1 text-[11px] text-muted-foreground">
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
          <label htmlFor="gender" className="block text-[11px] font-medium text-muted-foreground">
            Gender
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
          >
            <option value="">Not set</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <label
            htmlFor="gender-visibility"
            className="mt-2 block text-[11px] font-medium text-muted-foreground"
          >
            Who can see my gender
          </label>
          <select
            id="gender-visibility"
            value={genderVisibility}
            onChange={(e) => setGenderVisibility(e.target.value)}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
          >
            {FIELD_VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pronouns" className="block text-[11px] font-medium text-muted-foreground">
            Pronouns
          </label>
          <input
            id="pronouns"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            maxLength={40}
            placeholder="she/her, he/him, they/them…"
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
          />
          <label
            htmlFor="pronouns-visibility"
            className="mt-2 block text-[11px] font-medium text-muted-foreground"
          >
            Who can see my pronouns
          </label>
          <select
            id="pronouns-visibility"
            value={pronounsVisibility}
            onChange={(e) => setPronounsVisibility(e.target.value)}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
          >
            {FIELD_VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="profile-visibility"
            className="block text-[11px] font-medium text-muted-foreground"
          >
            Who can view my profile
          </label>
          <select
            id="profile-visibility"
            value={profileVisibility}
            onChange={(e) => setProfileVisibility(e.target.value)}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
          >
            {PROFILE_VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Private hides your bio, photos and updates from everyone but you and staff.
          </p>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-muted-foreground">
            Badge beside your name
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDecoration("")}
              aria-pressed={decoration === ""}
              className={cn(
                "rounded-xl border-2 bg-secondary px-3 py-1.5 text-xs font-medium",
                decoration === "" ? "border-primary" : "border-transparent",
              )}
            >
              None
            </button>
            {DECORATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDecoration(d.value)}
                aria-label={d.label}
                aria-pressed={decoration === d.value}
                className={cn(
                  "grid size-10 place-items-center rounded-xl border-2 bg-secondary text-base",
                  decoration === d.value ? "border-primary" : "border-transparent",
                )}
              >
                <span role="img" aria-hidden>
                  {d.glyph}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-muted-foreground">Name color</span>
          <p className="mt-1 text-[11px] text-muted-foreground">Red is reserved for admins.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {NAME_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setNameColor(c.value)}
                aria-label={c.label}
                aria-pressed={nameColor === c.value}
                className={cn(
                  "size-9 rounded-full border-2 bg-secondary text-[11px] font-semibold",
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
              style={nameColor ? { color: readableNameColor(nameColor) } : undefined}
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

      <div className="mt-8">
        <ProfilePhotos userId={user.id} editable title="Your photos" />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Photos show on your profile. Images up to 8 MB.
        </p>
      </div>

      <div className="mt-8">
        <InviteCard userId={user.id} />
      </div>

      <div className="mt-8">
        <BlockList meId={user.id} />
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Password</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          We'll email {user.email ?? "your address"} a link to choose a new password.
        </p>
        <button
          type="button"
          disabled={resetting || !user.email}
          onClick={async () => {
            if (!user.email) return;
            setResetting(true);
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
              redirectTo: `${window.location.origin}/reset-password`,
            });
            setResetting(false);
            setMessage(error ? error.message : "Password reset email sent — check your inbox.");
          }}
          className="mt-3 rounded-xl bg-secondary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {resetting ? "Sending…" : "Send password reset email"}
        </button>
      </section>

      <div className="mt-8">
        <ProfileFeed userId={user.id} title="Your updates" />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Updates you post here appear in your profile’s update feed.
        </p>
      </div>
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
