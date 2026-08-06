import { Link } from "@tanstack/react-router";
import { ArrowLeft, Phone, SendHorizonal, Users, Video } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { CallOverlay } from "./CallOverlay";
import { MemberList } from "./MemberList";
import { useMessages, useRoomAdmins, useRoomBans, useRoomEvents } from "@/hooks/use-chat";
import { useOpenDirect } from "@/hooks/use-direct";
import {
  siteRoleBadgeClass,
  siteRoleLabel,
  siteRoleOf,
  siteRoleTextClass,
  useSiteRoles,
} from "@/hooks/use-roles";
import {
  accentFor,
  addRoomAdmin,
  banMember,
  counterpartId,
  formatTime,
  isOnline,
  joinRoom,
  kickMember,
  leaveRoom,
  removeRoomAdmin,
  sendMessage,
  unbanMember,
  type Membership,
  type Profile,
  type Room,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

function isEmojiOnly(body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 12) return false;
  return /^[\p{Extended_Pictographic}\uFE0F\u200D\s\u{1F3FB}-\u{1F3FF}\u{20E3}]+$/u.test(trimmed);
}

export function ChatPane({
  room,
  memberships,
  profiles,
  meId,
}: {
  room: Room;
  memberships: Membership[];
  profiles: Profile[];
  meId: string;
}) {
  const queryClient = useQueryClient();
  const members = memberships.filter((m) => m.room_id === room.id);
  const joined = members.some((m) => m.user_id === meId);
  const onlineCount = members.filter((m) =>
    profiles.some((p) => p.id === m.user_id && isOnline(p)),
  ).length;

  const profileOf = (userId: string) => profiles.find((p) => p.id === userId);
  const partner = room.is_direct ? profileOf(counterpartId(room, meId) ?? "") : undefined;
  const title = room.is_direct ? (partner?.display_name ?? "Direct message") : room.name;
  const { open: openDirect } = useOpenDirect(meId);
  const [showMembers, setShowMembers] = useState(false);

  const [draft, setDraft] = useState("");
  const [call, setCall] = useState<"voice" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading } = useMessages(room.id, joined);
  const { data: roomEvents = [] } = useRoomEvents(room.id, joined && !room.is_direct);
  const { data: roomAdmins = [] } = useRoomAdmins(room.id, joined && !room.is_direct);
  const isOwner = room.created_by === meId;
  const canModerate = !room.is_direct && (isOwner || roomAdmins.some((a) => a.user_id === meId));
  const { data: bans = [] } = useRoomBans(room.id, canModerate);
  const { data: siteRoles } = useSiteRoles();

  type TimelineItem =
    | { kind: "message"; id: string; at: string; message: (typeof messages)[number] }
    | { kind: "event"; id: string; at: string; userId: string; action: "join" | "leave" };

  const timeline: TimelineItem[] = [
    ...messages.map((m) => ({ kind: "message" as const, id: m.id, at: m.created_at, message: m })),
    ...roomEvents.map((e) => ({
      kind: "event" as const,
      id: e.id,
      at: e.created_at,
      userId: e.user_id,
      action: e.kind,
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  useEffect(() => {
    if (joined) inputRef.current?.focus();
  }, [room.id, joined]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, room.id]);

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await sendMessage(room.id, meId, text);
      await queryClient.invalidateQueries({ queryKey: ["messages", room.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to send.");
      setDraft(text);
    }
    inputRef.current?.focus();
  };

  const join = async () => {
    try {
      await joinRoom(room.id, meId);
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    } catch {
      setError("You can’t join this room — you’ve been banned by a room admin.");
    }
  };

  const leave = async () => {
    await leaveRoom(room.id, meId);
    await queryClient.invalidateQueries({ queryKey: ["memberships"] });
  };

  const runModeration = async (action: () => Promise<void>, keys: string[]) => {
    try {
      await action();
      for (const key of keys) {
        await queryClient.invalidateQueries({ queryKey: [key, room.id] });
      }
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action was not allowed.");
    }
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-3 sm:px-4">
        <Link
          to="/chat"
          className="-ml-1 grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary md:hidden"
          aria-label="Back to rooms"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar
          name={title}
          accent={accentFor(partner?.id ?? room.id)}
          avatarPath={partner?.avatar_url ?? null}
          online={partner ? isOnline(partner) : onlineCount > 0}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {room.is_direct
              ? partner
                ? `${isOnline(partner) ? "Online" : "Offline"} · @${partner.username}`
                : "Private chat"
              : `${members.length} ${members.length === 1 ? "member" : "members"} · ${onlineCount} online${
                  room.topic ? ` · ${room.topic}` : ""
                }`}
          </p>
        </div>
        <button
          onClick={() => setShowMembers((v) => !v)}
          className={cn(
            "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium",
            showMembers
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-secondary",
          )}
          aria-label="Show members"
          title="Show members"
        >
          <Users className="size-4" />
          {members.length}
        </button>
        <button
          onClick={() => setCall("voice")}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          aria-label="Start voice call"
        >
          <Phone className="size-4" />
        </button>
        <button
          onClick={() => setCall("video")}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          aria-label="Start video call"
        >
          <Video className="size-4" />
        </button>
      </header>

      {call ? (
        <CallOverlay
          title={title}
          accent={accentFor(partner?.id ?? room.id)}
          mode={call}
          roomId={room.id}
          meId={meId}
          myName={profileOf(meId)?.display_name ?? "You"}
          onEnd={() => setCall(null)}
        />
      ) : null}

      {showMembers ? (
        <MemberList
          memberships={members}
          profiles={profiles}
          meId={meId}
          ownerId={room.is_direct ? undefined : room.created_by}
          roomAdminIds={roomAdmins.map((a) => a.user_id)}
          bans={bans}
          canModerate={canModerate}
          isOwner={isOwner}
          onPromote={(userId) =>
            void runModeration(() => addRoomAdmin(room.id, userId, meId), ["room-admins"])
          }
          onDemote={(userId) =>
            void runModeration(() => removeRoomAdmin(room.id, userId), ["room-admins"])
          }
          onKick={(userId) => void runModeration(() => kickMember(room.id, userId), [])}
          onBan={(userId) =>
            void runModeration(() => banMember(room.id, userId, meId), ["room-bans"])
          }
          onUnban={(userId) => void runModeration(() => unbanMember(room.id, userId), ["room-bans"])}
          onClose={() => setShowMembers(false)}
          onMessage={(userId) => {
            setShowMembers(false);
            void openDirect(userId);
          }}
          onLeave={
            room.is_direct
              ? undefined
              : () => {
                  setShowMembers(false);
                  void leave();
                }
          }
        />
      ) : null}

      {joined ? (
        <>
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
            ) : null}
            {!isLoading && messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No messages yet — say hello.
              </p>
            ) : null}
            {timeline.map((item, i) => {
              if (item.kind === "event") {
                const who = profileOf(item.userId);
                const name = item.userId === meId ? "You" : (who?.display_name ?? "Someone");
                return (
                  <div key={item.id} className="mt-4 flex justify-center">
                    <span className="rounded-full bg-secondary px-3 py-1 text-[11px] text-muted-foreground">
                      {name} {item.action === "join" ? "joined" : "left"} the room ·{" "}
                      {formatTime(item.at)}
                    </span>
                  </div>
                );
              }
              const m = item.message;
              const mine = m.user_id === meId;
              const prev = timeline[i - 1];
              const grouped = prev?.kind === "message" && prev.message.user_id === m.user_id;
              const author = profileOf(m.user_id);
              const authorName = author?.display_name ?? "Someone";
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-end gap-2",
                    mine ? "flex-row-reverse" : "flex-row",
                    grouped ? "mt-0.5" : "mt-4",
                  )}
                >
                  {grouped ? (
                    <span className="size-9 shrink-0" aria-hidden="true" />
                  ) : (
                    <Avatar
                      name={authorName}
                      accent={accentFor(m.user_id)}
                      avatarPath={author?.avatar_url ?? null}
                      online={author ? isOnline(author) : false}
                      size="sm"
                    />
                  )}
                  <div className={cn("flex min-w-0 flex-col", mine ? "items-end" : "items-start")}>
                    {!mine && !grouped ? (
                      <span className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-medium">
                        <span
                          className={
                            siteRoleTextClass(siteRoleOf(siteRoles, m.user_id)) ??
                            "text-muted-foreground"
                          }
                        >
                          {authorName}
                        </span>
                        {siteRoleLabel(siteRoleOf(siteRoles, m.user_id)) ? (
                          <span
                            className={cn(
                              "rounded-md px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                              siteRoleBadgeClass(siteRoleOf(siteRoles, m.user_id)),
                            )}
                          >
                            {siteRoleLabel(siteRoleOf(siteRoles, m.user_id))}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[78%] px-4 py-2.5 text-sm leading-relaxed",
                        mine
                          ? "rounded-3xl rounded-br-md bg-bubble-me text-bubble-me-foreground"
                          : "rounded-3xl rounded-bl-md bg-bubble-them text-bubble-them-foreground",
                        isEmojiOnly(m.body) && "bg-transparent px-1 py-0.5 text-3xl leading-tight",
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="mt-1 px-1 text-[10px] text-muted-foreground">
                      {formatTime(m.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="border-t border-border px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {error ? <p className="px-2 pb-2 text-xs text-destructive">{error}</p> : null}
            <div className="flex items-end gap-2 rounded-2xl bg-secondary p-2">
              <EmojiPicker
                onSelect={(emoji) => {
                  const el = inputRef.current;
                  if (!el) {
                    setDraft((d) => d + emoji);
                    return;
                  }
                  const start = el.selectionStart ?? el.value.length;
                  const end = el.selectionEnd ?? start;
                  const next = el.value.slice(0, start) + emoji + el.value.slice(end);
                  setDraft(next.slice(0, 2000));
                  requestAnimationFrame(() => {
                    el.focus();
                    const caret = start + emoji.length;
                    el.setSelectionRange(caret, caret);
                  });
                }}
              />
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                placeholder={`Message ${room.name}`}
                aria-label="Message"
                className="max-h-32 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => void submit()}
                disabled={draft.trim().length === 0}
                aria-label="Send message"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              >
                <SendHorizonal className="size-4" />
              </button>
            </div>
          </footer>
        </>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center px-6 text-center">
          <div className="max-w-sm">
              <h3 className="text-lg font-semibold">Join {title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Messages in this room are only visible to members.
            </p>
            <button
              onClick={() => void join()}
              className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Join room
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
