import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  Gamepad2,
  Mic,
  Newspaper,
  Phone,
  Radio,
  SendHorizonal,
  Users,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { openProfile } from "./ProfileViewer";
import { CallOverlay } from "./CallOverlay";
import { TalkBar } from "./TalkBar";
import { MemberList } from "./MemberList";
import { InvitePanel } from "./InvitePanel";
import { MemberAvatars } from "./MemberAvatars";
import { RoomFeed } from "./RoomFeed";
import { RadioPlayer } from "./RadioPlayer";
import { GamesPanel } from "./GamesPanel";
import { TriviaBot } from "./TriviaBot";
import { RoomBanner } from "./RoomBanner";
import { RatingControl } from "./RoomRating";
import { YouTubeEmbed } from "./YouTubeEmbed";
import {
  useBlocks,
  useMessages,
  useRoomAdmins,
  useRoomBans,
  useRoomEvents,
  useRoomSilences,
} from "@/hooks/use-chat";
import { useOpenDirect } from "@/hooks/use-direct";
import { blockUser, isBlocked, unblockUser } from "@/lib/blocks";
import { takePendingCall } from "@/lib/call-invites";
import {
  siteRoleBadgeClass,
  siteRoleLabel,
  siteRoleOf,
  siteRoleTextClass,
  nameColorStyle,
  useSiteRoles,
} from "@/hooks/use-roles";
import {
  accentFor,
  addRoomAdmin,
  banMember,
  counterpartId,
  formatTime,
  isActive,
  isAdultProfile,
  isOnline,
  joinRoom,
  kickMember,
  leaveRoom,
  removeRoomAdmin,
  sendMessage,
  setRoomAdminTier,
  setRoomStatusMessage,
  setRoomRadio,
  setRoomBranding,
  setRoomRating,
  setRoomCategory,
  ROOM_CATEGORIES,
  setRoomYouTube,
  silenceMember,
  unbanMember,
  unsilenceMember,
  type Membership,
  type Profile,
  type Room,
  type RoomAdminTier,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import { MessageVideo, videoEmbedOf } from "./MessageVideo";

function isEmojiOnly(body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 12) return false;
  return /^[\p{Extended_Pictographic}\uFE0F\u200D\s\u{1F3FB}-\u{1F3FF}\u{20E3}]+$/u.test(trimmed);
}

function gifUrlOf(body: string) {
  const trimmed = body.trim();
  if (!/^https:\/\/\S+$/i.test(trimmed) || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith("klipy.com") && !url.hostname.endsWith("klipy.co")) return null;
    return trimmed;
  } catch {
    return null;
  }
}

/** Camera go-live notices are sent as sentinel messages and shown as pills. */
function liveNoticeOf(body: string): "on" | "off" | null {
  const trimmed = body.trim();
  if (trimmed === "::live::on") return "on";
  if (trimmed === "::live::off") return "off";
  return null;
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
  const [showMembers, setShowMembers] = useState(!room.is_direct);
  const [showFeed, setShowFeed] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [statusDraft, setStatusDraft] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [call, setCall] = useState<"voice" | "video" | null>(null);
  const [talking, setTalking] = useState(false);
  const [showCams, setShowCams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading } = useMessages(room.id, joined);
  const { data: roomEvents = [] } = useRoomEvents(room.id, joined && !room.is_direct);
  const { data: roomAdmins = [] } = useRoomAdmins(room.id, joined && !room.is_direct);
  const isOwner = room.created_by === meId;
  const myTier = roomAdmins.find((a) => a.user_id === meId)?.tier ?? null;
  const canModerate = !room.is_direct && (isOwner || myTier !== null);
  const isSuper = !room.is_direct && (isOwner || myTier === "super");
  const { data: bans = [] } = useRoomBans(room.id, canModerate);
  const { data: silences = [] } = useRoomSilences(room.id, joined && !room.is_direct);
  const { data: blocks = [] } = useBlocks(meId);
  const mySilence = silences.find((s) => s.user_id === meId && isActive(s)) ?? null;
  const { data: siteRoles } = useSiteRoles();
  const myProfile = profileOf(meId);
  const adultsOnly = room.rating === "R" && !room.is_direct;
  const ageBlocked = adultsOnly && !isAdultProfile(myProfile);

  type TimelineItem =
    | { kind: "message"; id: string; at: string; message: (typeof messages)[number] }
    | {
        kind: "event";
        id: string;
        at: string;
        userId: string;
        action: "join" | "leave" | "bounce";
      };

  const timeline: TimelineItem[] = [
    ...messages
      .filter((m) => m.user_id === meId || !isBlocked(blocks, m.user_id))
      .map((m) => ({ kind: "message" as const, id: m.id, at: m.created_at, message: m })),
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

  // Answering an incoming direct call opens the overlay on arrival.
  useEffect(() => {
    const mode = takePendingCall(room.id);
    if (mode) setCall(mode);
  }, [room.id]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, room.id]);

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    if (ageBlocked) {
      setError("This room is rated R — you must be 18 or older to post here.");
      return;
    }
    if (mySilence) {
      setError("A room admin has silenced you here, so you can read but not post.");
      return;
    }
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
    if (ageBlocked) {
      setError(
        myProfile?.birth_date
          ? `“${room.name}” is rated R — you must be 18 or older to join.`
          : `“${room.name}” is rated R. Add your date of birth in Settings to confirm you are 18 or older.`,
      );
      return;
    }
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
    <section
      className="flex h-full min-h-0 flex-col bg-background"
      aria-label={`Conversation: ${title}`}
    >
      <header className="flex flex-col gap-2 border-b border-border px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:flex-row lg:items-center lg:gap-3 lg:px-4">
        <div className="flex min-w-0 items-center gap-2 lg:flex-1 lg:gap-3">
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
                : `${room.category || "General"} · ${members.length} ${members.length === 1 ? "member" : "members"} · ${onlineCount} online${
                    room.topic ? ` · ${room.topic}` : ""
                  }`}
            </p>
            {!room.is_direct && room.status_message ? (
              <p className="truncate text-xs font-medium text-primary" title={room.status_message}>
                {room.status_message}
              </p>
            ) : null}
          </div>
        </div>
        {!room.is_direct && members.length > 0 ? (
          <MemberAvatars
            members={members}
            profiles={profiles}
            onShowAll={() => {
              setShowFeed(false);
              setShowMedia(false);
              setShowGames(false);
              setShowTrivia(false);
              setShowMembers(true);
            }}
          />
        ) : null}
        <div className="scroll-rail -mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-0.5 lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0">
          {!room.is_direct && isSuper ? (
            <button
              onClick={() => setStatusDraft(room.status_message ?? "")}
              className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary/70"
            >
              Room status
            </button>
          ) : null}
          {!room.is_direct ? (
            isOwner ? (
              <select
                aria-label="Room category"
                value={room.category || "General"}
                onChange={async (e) => {
                  try {
                    await setRoomCategory(room.id, e.target.value);
                    await queryClient.invalidateQueries({ queryKey: ["rooms"] });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not change the category.");
                  }
                }}
                className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground outline-none"
              >
                {[...new Set([...ROOM_CATEGORIES, room.category || "General"])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : null
          ) : null}
          {!room.is_direct ? (
            <RatingControl
              rating={room.rating}
              canEdit={isOwner}
              onChange={async (next) => {
                try {
                  await setRoomRating(room.id, next);
                  await queryClient.invalidateQueries({ queryKey: ["rooms"] });
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Could not change the room rating.",
                  );
                }
              }}
            />
          ) : null}
          <button
            onClick={() => {
              setShowMembers(false);
              setShowFeed(false);
              setShowMedia(false);
              setShowTrivia(false);
              setShowGames((v) => !v);
            }}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium",
              showGames ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
            )}
            aria-label="Show games"
            aria-pressed={showGames}
            title="Games"
          >
            <Gamepad2 className="size-4" />
            Games
          </button>
          {!room.is_direct ? (
            <button
              onClick={() => {
                setShowMembers(false);
                setShowFeed(false);
                setShowMedia(false);
                setShowGames(false);
                setShowTrivia((v) => !v);
              }}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium",
                showTrivia
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Show trivia bot"
              aria-pressed={showTrivia}
              title="Trivia bot"
            >
              <Bot className="size-4" />
              Trivia
            </button>
          ) : null}
          <button
            onClick={() => {
              setShowFeed(false);
              setShowMedia(false);
              setShowGames(false);
              setShowTrivia(false);
              setShowInvite(false);
              setShowMembers((v) => !v);
            }}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium",
              showMembers
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary",
            )}
            aria-label="Show members"
            aria-pressed={showMembers}
            title="Show members"
          >
            <Users className="size-4" />
            {members.length}
          </button>
          {!room.is_direct && joined ? (
            <button
              onClick={() => {
                setShowMembers(false);
                setShowFeed(false);
                setShowMedia(false);
                setShowGames(false);
                setShowTrivia(false);
                setShowInvite((v) => !v);
              }}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium",
                showInvite
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Invite people to this room"
              aria-pressed={showInvite}
              title="Invite people"
            >
              <UserPlus className="size-4" />
              Invite
            </button>
          ) : null}
          {!room.is_direct && joined ? (
            <button
              onClick={() => {
                setShowMembers(false);
                setShowMedia(false);
                setShowGames(false);
                setShowTrivia(false);
                setShowFeed((v) => !v);
              }}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                showFeed
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Show room feed"
              aria-pressed={showFeed}
              title="Room feed"
            >
              <Newspaper className="size-4" />
            </button>
          ) : null}
          {!room.is_direct ? (
            <button
              onClick={() => {
                setShowMembers(false);
                setShowFeed(false);
                setShowGames(false);
                setShowTrivia(false);
                setShowMedia((v) => !v);
              }}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                showMedia
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Show radio and video players"
              aria-pressed={showMedia}
              title="Radio & video"
            >
              <Radio className="size-4" />
            </button>
          ) : null}
          <button
            onClick={() => setCall("voice")}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            aria-label="Start voice call"
          >
            <Phone className="size-4" />
          </button>
          <button
            onClick={() => setTalking((v) => !v)}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold",
              talking ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
            )}
            aria-label={talking ? "Leave room voice" : "Join room voice with push to talk"}
            aria-pressed={talking}
            title="Talk"
          >
            <Mic className="size-4" />
            Talk
          </button>
          <button
            onClick={() => {
              // Cams ride along on the room voice session, so make sure it's live.
              setTalking(true);
              setShowCams((v) => !v);
            }}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold",
              showCams ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
            )}
            aria-label="Show room cameras"
            aria-pressed={showCams}
            title="Cams"
          >
            <Video className="size-4" />
            Cams
          </button>
          <button
            onClick={() => setCall("video")}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            aria-label="Start video call"
          >
            <Video className="size-4" />
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col">
          {statusDraft !== null ? (
            <form
              className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const next = statusDraft.trim();
                try {
                  await setRoomStatusMessage(room.id, next || null);
                  await queryClient.invalidateQueries({ queryKey: ["rooms"] });
                  setStatusDraft(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save the room status.");
                }
              }}
            >
              <input
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                maxLength={200}
                autoFocus
                aria-label="Room status message"
                placeholder="Room status shown to everyone (leave empty to clear)"
                className="min-w-0 flex-1 rounded-xl bg-background px-3 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setStatusDraft(null)}
                className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </form>
          ) : null}

          {talking ? (
            <TalkBar
              roomId={room.id}
              meId={meId}
              myName={profileOf(meId)?.display_name ?? "You"}
              onLeave={() => {
                setTalking(false);
                setShowCams(false);
              }}
              camsOpen={showCams}
              onCamsOpenChange={setShowCams}
            />
          ) : null}

          {!room.is_direct ? (
            <>
              <RoomBanner
                roomId={room.id}
                roomName={room.name}
                branding={{
                  icon_url: room.icon_url,
                  banner_url: room.banner_url,
                  website_url: room.website_url,
                  website_label: room.website_label,
                }}
                canEdit={isOwner}
                onSave={async (next) => {
                  const saved = await setRoomBranding(room.id, next);
                  queryClient.setQueryData<Room[]>(["rooms"], (rooms) =>
                    rooms?.map((item) => (item.id === room.id ? { ...item, ...saved } : item)),
                  );
                }}
              />
            </>
          ) : null}

          {!room.is_direct ? (
            <section
              className={cn(
                "absolute inset-y-0 right-0 z-20 flex w-full max-w-[92%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out sm:max-w-sm",
                showMedia ? "translate-x-0" : "pointer-events-none translate-x-full",
              )}
              aria-hidden={!showMedia}
              role="region"
              aria-label="Radio and video players"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <h3 className="text-sm font-semibold">Radio &amp; video</h3>
                <button
                  onClick={() => setShowMedia(false)}
                  className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
                  aria-label="Close players"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <RadioPlayer
                  url={room.radio_url}
                  name={room.radio_name}
                  canEdit={isOwner}
                  onSave={async (radio) => {
                    await setRoomRadio(room.id, radio);
                    await queryClient.invalidateQueries({ queryKey: ["rooms"] });
                  }}
                />
                <YouTubeEmbed
                  url={room.youtube_url}
                  title={room.youtube_title}
                  canEdit={canModerate}
                  onSave={async (video) => {
                    await setRoomYouTube(room.id, video);
                    await queryClient.invalidateQueries({ queryKey: ["rooms"] });
                  }}
                />
              </div>
            </section>
          ) : null}

          <section
            className={cn(
              "absolute inset-y-0 right-0 z-20 flex w-full max-w-[92%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out sm:max-w-sm",
              showGames ? "translate-x-0" : "pointer-events-none translate-x-full",
            )}
            aria-hidden={!showGames}
            role="region"
            aria-label="Games"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <h3 className="text-sm font-semibold">Games</h3>
              <button
                onClick={() => setShowGames(false)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
                aria-label="Close games"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {showGames ? <GamesPanel /> : null}
            </div>
          </section>

          {!room.is_direct ? (
            <section
              className={cn(
                "absolute inset-y-0 right-0 z-20 flex w-full max-w-[92%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out sm:max-w-sm",
                showTrivia ? "translate-x-0" : "pointer-events-none translate-x-full",
              )}
              aria-hidden={!showTrivia}
              role="region"
              aria-label="Trivia bot"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <h3 className="text-sm font-semibold">Trivia bot</h3>
                <button
                  onClick={() => setShowTrivia(false)}
                  className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
                  aria-label="Close trivia bot"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <TriviaBot
                  roomId={room.id}
                  roomName={room.name}
                  meId={meId}
                  enabled={room.trivia_enabled}
                  canManage={canModerate}
                  joined={joined}
                  profiles={profiles}
                />
              </div>
            </section>
          ) : null}

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
        </div>
        {showMembers ? (
          <MemberList
            memberships={members}
            profiles={profiles}
            meId={meId}
            ownerId={room.is_direct ? undefined : room.created_by}
            roomAdmins={roomAdmins}
            bans={bans}
            silences={silences}
            blocks={blocks}
            events={
              room.is_direct
                ? undefined
                : roomEvents.map((e) => ({
                    id: e.id,
                    userId: e.user_id,
                    action: e.kind,
                    at: e.created_at,
                  }))
            }
            canModerate={canModerate}
            isSuper={isSuper}
            onSetTier={(userId: string, tier: RoomAdminTier) =>
              void runModeration(
                () =>
                  roomAdmins.some((a) => a.user_id === userId)
                    ? setRoomAdminTier(room.id, userId, tier)
                    : addRoomAdmin(room.id, userId, meId, tier),
                ["room-admins"],
              )
            }
            onRemoveAdmin={(userId: string) =>
              void runModeration(() => removeRoomAdmin(room.id, userId), ["room-admins"])
            }
            onBounce={(userId: string) => void runModeration(() => kickMember(room.id, userId), [])}
            onRestrict={(userId: string, expiresAt: string | null) =>
              void runModeration(
                () => banMember(room.id, userId, meId, undefined, expiresAt),
                ["room-bans"],
              )
            }
            onUnrestrict={(userId: string) =>
              void runModeration(() => unbanMember(room.id, userId), ["room-bans"])
            }
            onSilence={(userId: string, expiresAt: string | null) =>
              void runModeration(
                () => silenceMember(room.id, userId, meId, expiresAt),
                ["room-silences"],
              )
            }
            onUnsilence={(userId: string) =>
              void runModeration(() => unsilenceMember(room.id, userId), ["room-silences"])
            }
            onBlock={(userId: string) =>
              void runModeration(async () => {
                await blockUser(meId, userId);
                await queryClient.invalidateQueries({ queryKey: ["blocks"] });
              }, [])
            }
            onUnblock={(userId: string) =>
              void runModeration(async () => {
                await unblockUser(meId, userId);
                await queryClient.invalidateQueries({ queryKey: ["blocks"] });
              }, [])
            }
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
      </div>
    </section>
  );
}
