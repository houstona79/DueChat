import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MailPlus,
  MessageSquare,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { openProfile } from "./ProfileViewer";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoomInvites } from "@/hooks/use-chat";
import { acceptRoomInvite, dismissRoomInvite } from "@/lib/room-invites";
import {
  clearNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationText,
} from "@/lib/notifications";
import {
  REACTION_EMOJIS,
  fetchProfileUpdateReactions,
  relativeTime,
  toggleProfileUpdateReaction,
} from "@/lib/profile-updates";
import { accentFor, type Profile } from "@/lib/chat";
import {
  MAX_COMMENT_LENGTH,
  addUpdateComment,
  deleteUpdateComment,
  fetchUpdateComments,
} from "@/lib/update-comments";
import { cn } from "@/lib/utils";
import { playSound, useSoundUnlock, useSounds } from "@/lib/sounds";

export function NotificationsPanel({
  me,
  profiles,
}: {
  me: Profile | null | undefined;
  profiles: Profile[];
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const { data: myInvites = [] } = useMyRoomInvites(me?.id);
  const { enabled: soundOn, toggle: toggleSound } = useSounds();
  useSoundUnlock();

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", me?.id],
    queryFn: () => fetchNotifications(me!.id),
    enabled: !!me?.id,
  });

  useEffect(() => {
    if (!me?.id) return;
    const channel = supabase
      .channel(`notifications:${me.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${me.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const kind = (payload.new as { kind?: string }).kind;
            playSound(kind === "room_invite" ? "invite" : "notification");
          }
          void queryClient.invalidateQueries({ queryKey: ["notifications", me.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me?.id, queryClient]);

  // Toast the moment a room invite arrives.
  useEffect(() => {
    if (!me?.id) return;
    const channel = supabase
      .channel(`room-invite-toast:${me.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${me.id}`,
        },
        (payload) => {
          const row = payload.new as {
            kind?: string;
            preview?: string | null;
            room_id?: string | null;
          };
          if (row.kind !== "room_invite") return;
          void queryClient.invalidateQueries({ queryKey: ["room-invites", me.id] });
          setCollapsed(false);
          toast(`You were invited to ${row.preview ?? "a room"}`, {
            action: row.room_id
              ? {
                  label: "Open",
                  onClick: () =>
                    void navigate({ to: "/chat/$roomId", params: { roomId: row.room_id! } }),
                }
              : undefined,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me?.id, queryClient, navigate]);

  const unread = items.filter((n) => !n.read_at).length;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications", me?.id] });

  const updateIds = [...new Set(items.map((n) => n.update_id).filter(Boolean))] as string[];
  const { data: reactions = [] } = useQuery({
    queryKey: ["notification-reactions", me?.id, updateIds.join(",")],
    queryFn: () => fetchProfileUpdateReactions(updateIds),
    enabled: !!me?.id && updateIds.length > 0,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["notification-comments", me?.id, updateIds.join(",")],
    queryFn: () => fetchUpdateComments(updateIds),
    enabled: !!me?.id && updateIds.length > 0,
  });

  const refreshComments = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notification-comments", me?.id] });
    await queryClient.invalidateQueries({ queryKey: ["update-comments"] });
  };

  const sendComment = async (updateId: string) => {
    if (!me || !draft.trim()) return;
    setSending(true);
    try {
      await addUpdateComment(updateId, me.id, draft);
      setDraft("");
      await refreshComments();
    } catch {
      toast.error("Couldn’t post that comment.");
    } finally {
      setSending(false);
    }
  };

  const react = async (updateId: string, emoji: string, mine: boolean) => {
    if (!me) return;
    try {
      await toggleProfileUpdateReaction(updateId, me.id, emoji, mine);
      await queryClient.invalidateQueries({ queryKey: ["notification-reactions", me.id] });
      await queryClient.invalidateQueries({ queryKey: ["profile-update-reactions"] });
    } catch {
      toast.error("Couldn’t add that reaction.");
    }
  };

  if (!me) return null;

  const actorOf = (id: string | null) => profiles.find((p) => p.id === id);

  return (
    <section className="mb-2">
      <div className="flex items-center gap-1 px-3 pb-1 pt-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex min-h-10 flex-1 items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          <Bell className="size-3.5" aria-hidden />
          Notifications
          {unread > 0 ? (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
              {unread}
            </span>
          ) : null}
        </button>
        {!collapsed && items.length > 0 ? (
          <>
            <button
              onClick={async () => {
                try {
                  await markAllNotificationsRead(me.id);
                  await refresh();
                } catch {
                  toast.error("Couldn’t mark those read.");
                }
              }}
              aria-label="Mark all notifications read"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={async () => {
                try {
                  await clearNotifications(me.id);
                  await refresh();
                } catch {
                  toast.error("Couldn’t clear notifications.");
                }
              }}
              aria-label="Clear notifications"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        ) : null}
      </div>

      {collapsed ? null : items.length === 0 ? (
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          No notifications yet. Reactions and replies to your updates land here.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((n) => {
            const actor = actorOf(n.actor_id);
            return (
              <li key={n.id}>
                <button
                  onClick={async () => {
                    if (!n.read_at) {
                      try {
                        await markNotificationRead(n.id);
                        await refresh();
                      } catch {
                        /* non-blocking */
                      }
                    }
                    if (n.kind === "room_invite") return;
                    openProfile(n.actor_id ?? me.id);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-secondary",
                    !n.read_at && "bg-secondary/60",
                  )}
                >
                  <Avatar
                    name={actor?.display_name ?? "Someone"}
                    accent={accentFor(n.actor_id ?? n.id)}
                    avatarPath={actor?.avatar_url ?? null}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      <span className="font-semibold">{actor?.display_name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{notificationText(n)}</span>
                    </span>
                    {n.preview ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        “{n.preview}”
                      </span>
                    ) : null}
                    <span className="block text-[11px] text-muted-foreground">
                      {relativeTime(n.created_at)}
                    </span>
                  </span>
                  {!n.read_at ? (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </button>

                {n.kind === "room_invite" && n.room_id ? (
                  <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pl-12">
                    <button
                      type="button"
                      disabled={inviteBusy === n.id}
                      onClick={async () => {
                        setInviteBusy(n.id);
                        try {
                          const invite = myInvites.find((i) => i.room_id === n.room_id);
                          if (invite) await acceptRoomInvite(invite, me.id);
                          await markNotificationRead(n.id).catch(() => {});
                          await queryClient.invalidateQueries({
                            queryKey: ["room-invites", me.id],
                          });
                          await queryClient.invalidateQueries({ queryKey: ["memberships"] });
                          await refresh();
                          await navigate({ to: "/chat/$roomId", params: { roomId: n.room_id! } });
                        } catch {
                          toast.error("Couldn’t join that room.");
                        } finally {
                          setInviteBusy(null);
                        }
                      }}
                      className="flex min-h-8 items-center gap-1 rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      <MailPlus className="size-3" aria-hidden />
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={inviteBusy === n.id}
                      onClick={async () => {
                        setInviteBusy(n.id);
                        try {
                          const invite = myInvites.find((i) => i.room_id === n.room_id);
                          if (invite) await dismissRoomInvite(invite.id);
                          await queryClient.invalidateQueries({
                            queryKey: ["room-invites", me.id],
                          });
                          await refresh();
                        } catch {
                          toast.error("Couldn’t decline that invite.");
                        } finally {
                          setInviteBusy(null);
                        }
                      }}
                      className="flex min-h-8 items-center gap-1 rounded-full border border-border px-2.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground disabled:opacity-60"
                    >
                      <X className="size-3" aria-hidden />
                      Decline
                    </button>
                  </div>
                ) : null}

                {n.update_id ? (
                  <div className="flex flex-wrap items-center gap-1 px-3 pb-2 pl-12">
                    {REACTION_EMOJIS.slice(0, 4).map((emoji) => {
                      const mine = reactions.some(
                        (r) =>
                          r.update_id === n.update_id && r.emoji === emoji && r.user_id === me.id,
                      );
                      const count = reactions.filter(
                        (r) => r.update_id === n.update_id && r.emoji === emoji,
                      ).length;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => void react(n.update_id!, emoji, mine)}
                          aria-pressed={mine}
                          aria-label={`React ${emoji}`}
                          className={cn(
                            "flex min-h-8 items-center gap-1 rounded-full border px-2 text-xs",
                            mine
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/60",
                          )}
                        >
                          <span aria-hidden>{emoji}</span>
                          {count > 0 ? (
                            <span className="font-semibold tabular-nums">{count}</span>
                          ) : null}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        openProfile(
                          n.kind === "update" ? (n.actor_id ?? me.id) : me.id,
                          n.update_id!,
                        )
                      }
                      className="flex min-h-8 items-center gap-1 rounded-full border border-border px-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    >
                      <ExternalLink className="size-3" aria-hidden />
                      View update
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft("");
                        setOpenComments((v) => (v === n.id ? null : n.id));
                      }}
                      aria-expanded={openComments === n.id}
                      className="flex min-h-8 items-center gap-1 rounded-full border border-border px-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    >
                      <MessageSquare className="size-3" aria-hidden />
                      {comments.filter((c) => c.update_id === n.update_id).length || ""} Comment
                    </button>
                  </div>
                ) : null}

                {n.update_id && openComments === n.id ? (
                  <div className="px-3 pb-3 pl-12">
                    <ul className="space-y-1.5">
                      {comments
                        .filter((c) => c.update_id === n.update_id)
                        .map((c) => {
                          const author = actorOf(c.user_id);
                          return (
                            <li
                              key={c.id}
                              className="flex items-start gap-2 rounded-xl bg-secondary/60 px-2.5 py-1.5"
                            >
                              <span className="min-w-0 flex-1 text-xs">
                                <span className="font-semibold">
                                  {author?.display_name ?? "Someone"}
                                </span>{" "}
                                <span className="break-words">{c.body}</span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {relativeTime(c.created_at)}
                                </span>
                              </span>
                              {c.user_id === me.id ? (
                                <button
                                  type="button"
                                  aria-label="Delete comment"
                                  onClick={async () => {
                                    try {
                                      await deleteUpdateComment(c.id);
                                      await refreshComments();
                                    } catch {
                                      toast.error("Couldn’t delete that comment.");
                                    }
                                  }}
                                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-background"
                                >
                                  <X className="size-3" />
                                </button>
                              ) : null}
                            </li>
                          );
                        })}
                    </ul>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void sendComment(n.update_id!);
                      }}
                      className="mt-1.5 flex items-center gap-1.5"
                    >
                      <label className="sr-only" htmlFor={`comment-${n.id}`}>
                        Write a comment
                      </label>
                      <input
                        id={`comment-${n.id}`}
                        value={draft}
                        maxLength={MAX_COMMENT_LENGTH}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Write a comment…"
                        className="min-h-9 flex-1 rounded-xl bg-secondary px-2.5 text-xs outline-none placeholder:text-muted-foreground"
                      />
                      <button
                        type="submit"
                        disabled={sending || !draft.trim()}
                        aria-label="Post comment"
                        className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        <Send className="size-3.5" />
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
