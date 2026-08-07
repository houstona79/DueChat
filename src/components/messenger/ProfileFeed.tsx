import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Flag,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Send,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { siteRoleOf, useSiteRoles } from "@/hooks/use-roles";
import {
  MAX_UPDATE_LENGTH,
  REACTION_EMOJIS,
  deleteProfileUpdate,
  editProfileUpdate,
  fetchProfileUpdateReactions,
  fetchProfileUpdates,
  postProfileUpdate,
  relativeTime,
  setProfileUpdatePinned,
  toggleProfileUpdateReaction,
} from "@/lib/profile-updates";
import {
  MAX_REPORT_DETAILS,
  REPORT_REASONS,
  fetchMyReportedUpdateIds,
  reportProfileUpdate,
} from "@/lib/update-reports";

export function ProfileFeed({ userId, title = "Updates" }: { userId: string; title?: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: roles } = useSiteRoles();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");

  const myRole = user ? siteRoleOf(roles, user.id) : null;
  const isStaff = myRole === "admin" || myRole === "moderator";
  const isMe = user?.id === userId;

  const { data: updates = [] } = useQuery({
    queryKey: ["profile-updates", userId],
    queryFn: () => fetchProfileUpdates(userId),
  });

  const updateIds = updates.map((u) => u.id);

  const { data: reactions = [] } = useQuery({
    queryKey: ["profile-update-reactions", userId, updateIds.join(",")],
    queryFn: () => fetchProfileUpdateReactions(updateIds),
    enabled: updateIds.length > 0,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["profile-update-reactions", userId] });
    return queryClient.invalidateQueries({ queryKey: ["profile-updates", userId] });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`profile-updates:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profile_updates", filter: `user_id=eq.${userId}` },
        () => void invalidate(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profile_update_reactions" },
        () => void queryClient.invalidateQueries({ queryKey: ["profile-update-reactions", userId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const post = useMutation({
    mutationFn: () => postProfileUpdate(userId, draft),
    onSuccess: () => {
      setDraft("");
      setError(null);
      return invalidate();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Couldn’t post that update."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProfileUpdate(id),
    onSuccess: () => invalidate(),
  });

  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => editProfileUpdate(id, body),
    onSuccess: () => {
      setEditingId(null);
      setEditDraft("");
      setError(null);
      return invalidate();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Couldn’t save that edit."),
  });

  const pin = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      setProfileUpdatePinned(userId, id, pinned),
    onSuccess: () => invalidate(),
  });

  const { data: reportedIds } = useQuery({
    queryKey: ["my-update-reports", user?.id],
    queryFn: () => fetchMyReportedUpdateIds(user!.id),
    enabled: !!user,
  });

  const report = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      reportProfileUpdate({
        updateId: id,
        reporterId: user!.id,
        reason: reportReason,
        details: reportDetails,
      }),
    onSuccess: () => {
      setReportingId(null);
      setReportDetails("");
      setReportReason(REPORT_REASONS[0]);
      toast.success("Thanks — our moderators will review this.");
      return queryClient.invalidateQueries({ queryKey: ["my-update-reports", user?.id] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn’t send that report."),
  });

  const react = useMutation({
    mutationFn: ({ id, emoji, mine }: { id: string; emoji: string; mine: boolean }) =>
      toggleProfileUpdateReaction(id, user!.id, emoji, mine),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["profile-update-reactions", userId] }),
  });

  const summarize = (updateId: string) => {
    const rows = reactions.filter((r) => r.update_id === updateId);
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of rows) {
      const entry = map.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (r.user_id === user?.id) entry.mine = true;
      map.set(r.emoji, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  };

  return (
    <section className="mt-4 space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Megaphone className="size-3.5" aria-hidden />
        {title}
      </h3>

      {isMe ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim() || post.isPending) return;
            post.mutate();
          }}
          className="space-y-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_UPDATE_LENGTH))}
            rows={2}
            placeholder="Share an update…"
            className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {draft.length}/{MAX_UPDATE_LENGTH}
            </span>
            <button
              type="submit"
              disabled={!draft.trim() || post.isPending}
              className="flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Send className="size-4" />
              Post
            </button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </form>
      ) : null}

      {updates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No updates yet.</p>
      ) : (
        <ul className="space-y-2">
          {updates.map((u) => (
            <li
              key={u.id}
              className={`group rounded-2xl px-3 py-2 ${
                u.pinned_at ? "border border-primary/40 bg-primary/5" : "bg-secondary"
              }`}
            >
              {u.pinned_at ? (
                <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Pin className="size-3" aria-hidden />
                  Pinned
                </p>
              ) : null}

              {editingId === u.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editDraft.trim() || edit.isPending) return;
                    edit.mutate({ id: u.id, body: editDraft });
                  }}
                  className="space-y-2"
                >
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value.slice(0, MAX_UPDATE_LENGTH))}
                    rows={3}
                    autoFocus
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft("");
                      }}
                      className="flex min-h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!editDraft.trim() || edit.isPending}
                      className="flex min-h-8 items-center gap-1 rounded-lg bg-primary px-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      <Check className="size-3.5" />
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <p className="whitespace-pre-line break-words text-sm">{u.body}</p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {summarize(u.id).map(([emoji, info]) => (
                  <button
                    key={emoji}
                    type="button"
                    disabled={!user || react.isPending}
                    onClick={() => react.mutate({ id: u.id, emoji, mine: info.mine })}
                    aria-label={`${emoji} ${info.count} reaction${info.count === 1 ? "" : "s"}`}
                    aria-pressed={info.mine}
                    className={`flex min-h-8 items-center gap-1 rounded-full border px-2 text-xs transition ${
                      info.mine
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/60"
                    }`}
                  >
                    <span aria-hidden>{emoji}</span>
                    <span className="font-semibold tabular-nums">{info.count}</span>
                  </button>
                ))}

                {user ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPickerFor((p) => (p === u.id ? null : u.id))}
                      aria-label="Add reaction"
                      className="grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    >
                      <SmilePlus className="size-3.5" />
                    </button>
                    {pickerFor === u.id ? (
                      <div className="absolute bottom-9 left-0 z-20 flex gap-1 rounded-2xl border border-border bg-popover p-1.5 shadow-lg">
                        {REACTION_EMOJIS.map((emoji) => {
                          const mine = reactions.some(
                            (r) => r.update_id === u.id && r.emoji === emoji && r.user_id === user.id,
                          );
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                react.mutate({ id: u.id, emoji, mine });
                                setPickerFor(null);
                              }}
                              className="grid size-8 place-items-center rounded-lg text-base hover:bg-secondary"
                            >
                              <span aria-hidden>{emoji}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {relativeTime(u.created_at)}
                  {u.updated_at && u.updated_at !== u.created_at ? " · edited" : ""}
                </span>
                <div className="flex items-center gap-0.5">
                  {isMe ? (
                    <>
                      <button
                        type="button"
                        onClick={() => pin.mutate({ id: u.id, pinned: !u.pinned_at })}
                        aria-label={u.pinned_at ? "Unpin update" : "Pin update"}
                        className={`grid size-8 place-items-center rounded-lg hover:bg-background ${
                          u.pinned_at ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {u.pinned_at ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(u.id);
                          setEditDraft(u.body);
                        }}
                        aria-label="Edit update"
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </>
                  ) : null}
                  {isMe || isStaff ? (
                    <button
                      type="button"
                      onClick={() => remove.mutate(u.id)}
                      aria-label="Delete update"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {user && !isMe ? (
                reportedIds?.has(u.id) ? (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Flag className="size-3" aria-hidden />
                    Reported — under review
                  </p>
                ) : reportingId === u.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (report.isPending) return;
                      report.mutate({ id: u.id });
                    }}
                    className="mt-2 space-y-2 rounded-xl border border-border bg-background p-2"
                  >
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Reason
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
                      >
                        {REPORT_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value.slice(0, MAX_REPORT_DETAILS))}
                      rows={2}
                      placeholder="Anything else moderators should know? (optional)"
                      className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReportingId(null)}
                        className="flex min-h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={report.isPending}
                        className="flex min-h-8 items-center gap-1 rounded-lg bg-destructive px-2 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
                      >
                        <Flag className="size-3.5" />
                        Send report
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReportingId(u.id)}
                    className="mt-1 flex min-h-8 items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    <Flag className="size-3" aria-hidden />
                    Report
                  </button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
