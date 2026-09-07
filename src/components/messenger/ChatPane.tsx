import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeInfo,
  Bot,
  ExternalLink,
  Gamepad2,
  Hand,
  Lock,
  Mic,
  Mic2,
  MoreHorizontal,
  Newspaper,
  Phone,
  Radio,
  Users,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import duechatLogo from "@/assets/duechat-logo.png.asset.json";
import { EmojiPicker } from "./EmojiPicker";
import { YahooSendIcon } from "@/components/icons/YahooIcons";
import { RoomCrownMarks } from "@/components/rooms/RoomCrown";
import { useRoomCrowns } from "@/lib/room-crowns";
import { GifPicker } from "./GifPicker";
import { EmojiText } from "./EmojiText";
import { hasImageEmoji, isImageEmojiOnly } from "@/lib/image-emojis";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { KaraokePanel } from "./KaraokePanel";
import { RoomBanner } from "./RoomBanner";
import { RatingControl } from "./RoomRating";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { GiftDialog } from "./GiftDialog";
import { EditRoomDialog } from "./EditRoomDialog";
import {
  useBlocks,
  useKaraokeQueue,
  useMessages,
  useRoomAdmins,
  useRoomBans,
  useRoomEvents,
  useRoomHands,
  useRoomSilences,
} from "@/hooks/use-chat";
import { grantMic, lowerHand, raiseHand, revokeMic } from "@/lib/hands";
import { markKaraokeSongPlayed } from "@/lib/karaoke";
import { AppIcon } from "@/components/icons/AppIcons";
import { useOpenDirect } from "@/hooks/use-direct";
import { useIsMobile } from "@/hooks/use-mobile";

import { useThreadWallpaper } from "@/hooks/use-wallpaper";
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
  unlockRoom,
  unsilenceMember,
  type Membership,
  type Profile,
  type Room,
  type RoomAdminTier,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import { openRoomWindow } from "@/lib/room-window";
import { playSound } from "@/lib/sounds";
import { TranslatedText } from "@/components/system/TranslatedText";
import { giftNoticeOf } from "@/lib/credits";
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

function isNotice(body: string) {
  return liveNoticeOf(body) !== null || giftNoticeOf(body) !== null;
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
  useThreadWallpaper(room.id);
  const members = memberships.filter((m) => m.room_id === room.id);
  const joined = members.some((m) => m.user_id === meId);
  const onlineCount = members.filter((m) =>
    profiles.some((p) => p.id === m.user_id && isOnline(p)),
  ).length;

  const profileOf = (userId: string) => profiles.find((p) => p.id === userId);
  const partner = room.is_direct ? profileOf(counterpartId(room, meId) ?? "") : undefined;
  const title = room.is_direct ? (partner?.display_name ?? "Direct message") : room.name;
  const { open: openDirect } = useOpenDirect(meId);
  const phone = useIsMobile();
  const [showMembers, setShowMembers] = useState(!room.is_direct);

  const roomCrowns = useRoomCrowns();
  const myCrowns = roomCrowns.get(room.id) ?? [];
  const [showFeed, setShowFeed] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [statusDraft, setStatusDraft] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState(false);

  const [draft, setDraft] = useState("");
  const [call, setCall] = useState<"voice" | "video" | null>(null);
  const [talking, setTalking] = useState(false);
  const [showCams, setShowCams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [giftTo, setGiftTo] = useState<string | null>(null);
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
  const { data: hands = [] } = useRoomHands(room.id, joined && !room.is_direct);
  const { data: karaokeQueue = [] } = useKaraokeQueue(room.id, joined && !room.is_direct);
  const { data: blocks = [] } = useBlocks(meId);
  const mySilence = silences.find((s) => s.user_id === meId && isActive(s)) ?? null;
  const { data: siteRoles } = useSiteRoles();
  const myProfile = profileOf(meId);
  const adultsOnly = room.rating === "R" && !room.is_direct;
  const ageBlocked = adultsOnly && !isAdultProfile(myProfile);
  const myHand = hands.find((h) => h.user_id === meId) ?? null;
  const needsCode = !room.is_direct && room.locked && !joined && !isOwner;
  const giftProfile = giftTo ? profileOf(giftTo) : undefined;

  /** Only one docked/slide-out panel at a time — keeps small screens readable. */
  const togglePanel = (
    which: "members" | "feed" | "media" | "games" | "trivia" | "invite" | "karaoke",
  ) => {
    setShowMembers((v) => (which === "members" ? !v : false));
    setShowFeed((v) => (which === "feed" ? !v : false));
    setShowMedia((v) => (which === "media" ? !v : false));
    setShowGames((v) => (which === "games" ? !v : false));
    setShowTrivia((v) => (which === "trivia" ? !v : false));
    setShowInvite((v) => (which === "invite" ? !v : false));
    setShowKaraoke((v) => (which === "karaoke" ? !v : false));
  };

  const closeOverlayPanels = useCallback(() => {
    setShowFeed(false);
    setShowMedia(false);
    setShowGames(false);
    setShowTrivia(false);
    setShowInvite(false);
    setShowKaraoke(false);
  }, []);

  /** Switching rooms should never carry a slide-out panel (e.g. trivia) with it. */
  useEffect(() => {
    closeOverlayPanels();
    setShowMembers(!room.is_direct);
  }, [room.id, room.is_direct, closeOverlayPanels]);

  /** Escape always closes whatever slide-out panel is open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlayPanels();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOverlayPanels]);

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
      if (room.is_direct) playSound("message");
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

  const enterWithCode = async () => {
    const code = codeDraft.trim();
    if (!code || unlocking) return;
    setUnlocking(true);
    setError(null);
    try {
      const ok = await unlockRoom(room.id, code);
      if (!ok) {
        setError("That entry code is not right.");
        return;
      }
      setCodeDraft("");
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enter this room.");
    } finally {
      setUnlocking(false);
    }
  };

  const toggleHand = async () => {
    try {
      if (myHand) await lowerHand(room.id, meId);
      else await raiseHand(room.id, meId);
      await queryClient.invalidateQueries({ queryKey: ["room-hands", room.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your raised hand.");
    }
  };

  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const isPopout = /(^|[?&])popout=1(&|$)/.test(searchStr ?? "");

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
      className="chat-wallpaper live-room flex h-full min-h-0 flex-col bg-background"
      aria-label={`Conversation: ${title}`}
    >
      <header className="app-titlebar live-room-header phone-chrome flex shrink-0 flex-col gap-1 border-b border-border px-2 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] short:gap-1 short:py-1 short:pt-[max(0.25rem,env(safe-area-inset-top))] sm:px-3 sm:py-2 sm:pt-[max(0.5rem,env(safe-area-inset-top))] lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 lg:px-4 lg:py-3">
        <div className="flex min-w-0 items-center gap-2 lg:min-w-[220px] lg:flex-1 lg:gap-3">
          {isPopout ? (
            <Link
              to="/chat"
              search={{ popout: "1" }}
              className="-ml-1 flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              aria-label="Back to room list"
            >
              <ArrowLeft className="size-4" />
              Rooms
            </Link>
          ) : (
            <Link
              to="/chat"
              className="-ml-1 grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary md:hidden"
              aria-label="Back to rooms"
            >
              <ArrowLeft className="size-5" />
            </Link>
          )}
          <Avatar
            name={title}
            accent={accentFor(partner?.id ?? room.id)}
            avatarPath={partner?.avatar_url ?? null}
            online={partner ? isOnline(partner) : onlineCount > 0}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {!room.is_direct ? (
                <span className="live-badge hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase sm:inline-flex">
                  Live
                </span>
              ) : null}
              <h2
                className="truncate text-sm font-semibold"
                style={!room.is_direct && room.name_color ? { color: room.name_color } : undefined}
              >
                {title}
              </h2>
              {room.is_direct ? null : <RoomCrownMarks crowns={myCrowns} />}
            </div>
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
              <p className="truncate text-xs font-medium text-primary short:hidden" title={room.status_message}>
                {room.status_message}
              </p>
            ) : null}
            {!room.is_direct ? (
              <Link
                to="/r/$slug"
                params={{ slug: room.slug }}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline short:hidden"
              >
                <BadgeInfo className="size-3.5 shrink-0" aria-hidden />
                View room profile
              </Link>
            ) : null}
          </div>
        </div>
        {!room.is_direct && members.length > 0 ? (
          <div className="min-w-0 hidden lg:hidden">
            <MemberAvatars
              members={members}
              profiles={profiles}
              onShowAll={() => {
                togglePanel("members");
                setShowMembers(true);
              }}
            />
          </div>
        ) : null}
        <div className="scroll-rail -mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-0.5 lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0">
          <a
            href="https://www.duechat.com"
            aria-label="DueChat"
            className="hidden shrink-0 lg:block"
          >
            <img
              src={duechatLogo.url}
              alt="DueChat"
              className="h-6 w-auto object-contain opacity-80 hover:opacity-100"
            />
          </a>
          {!room.is_direct && isSuper ? (
            <button
              onClick={() => setStatusDraft(room.status_message ?? "")}
              className="hidden shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary/70 lg:block"
            >
              Room status
            </button>
          ) : null}
          {!room.is_direct && isOwner ? (
            <button
              onClick={() => setEditingRoom(true)}
              className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary/70"
            >
              Edit room
            </button>
          ) : null}
          {!room.is_direct && isOwner ? (
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
              className="hidden shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground outline-none lg:block"
            >
              {[...new Set([...ROOM_CATEGORIES, room.category || "General"])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : null}
          {!room.is_direct ? (
            <span className="hidden shrink-0 lg:inline-flex">
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
            </span>
          ) : null}
          {!room.is_direct ? (
            <Link
              to="/r/$slug"
              params={{ slug: room.slug }}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary lg:flex"
              aria-label="View room profile in a new tab"
              title="View room profile (new tab)"
            >
              <BadgeInfo className="size-4" />
              Room profile
            </Link>
          ) : null}
          {typeof window !== "undefined" && !window.opener && !isPopout ? (
            <button
              type="button"
              onClick={() => {
                const opened = openRoomWindow(room.id, room.is_direct ? "im" : "room");
                if (!opened) {
                  setError("DueChat could not open the window. Allow pop-ups for DueChat and try again.");
                }
              }}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-secondary lg:w-auto lg:gap-1.5 lg:px-2.5"
              aria-label={room.is_direct ? "Open this IM in a fixed window" : "Open this room in a fixed window"}
              title="Open in fixed window"
            >
              <ExternalLink className="size-4" />
              <span className="hidden lg:inline">{room.is_direct ? "IM window" : "Room window"}</span>
            </button>
          ) : null}
          <button
            onClick={() => togglePanel("games")}
            className={cn(
              "hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium lg:flex",
              showGames ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
            )}
            aria-label="Show games"
            aria-pressed={showGames}
            title="Games"
          >
            <AppIcon name="games" className={"size-6 sm:size-[34px]"} />
            Games
          </button>
          {!room.is_direct ? (
            <button
              onClick={() => togglePanel("trivia")}
              className={cn(
                "hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium lg:flex",
                showTrivia
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Show trivia bot"
              aria-pressed={showTrivia}
              title="Trivia bot"
            >
              <AppIcon name="bot" className={"size-6 sm:size-[34px]"} />
              Trivia
            </button>
          ) : null}
          {!room.is_direct ? (
            <button
              onClick={() => togglePanel("karaoke")}
              className={cn(
                "hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium lg:flex",
                showKaraoke
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Show karaoke queue"
              aria-pressed={showKaraoke}
              title="Karaoke"
            >
              <AppIcon name="mic" className={"size-6 sm:size-[34px]"} />
              Karaoke
              {karaokeQueue.filter((s) => !s.played_at).length
                ? ` (${karaokeQueue.filter((s) => !s.played_at).length})`
                : ""}
            </button>
          ) : null}
          <button
            onClick={() => togglePanel("members")}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1 rounded-xl border border-border px-2 text-[11px] font-medium sm:h-11 sm:gap-1.5 sm:px-3 sm:text-xs lg:h-10 lg:px-2.5",
              showMembers
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary",
            )}
            aria-label="Show members"
            aria-pressed={showMembers}
            title="Show members"
          >
            <AppIcon name="members" className={"size-5 sm:size-6"} />
            {members.length}
          </button>
          {!room.is_direct && joined ? (
            <button
              onClick={() => togglePanel("invite")}
              className={cn(
                "hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium lg:flex",
                showInvite
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Invite people to this room"
              aria-pressed={showInvite}
              title="Invite people"
            >
              <AppIcon name="invite" className={"size-6 sm:size-[34px]"} />
              Invite
            </button>
          ) : null}
          {!room.is_direct && joined ? (
            <button
              onClick={() => togglePanel("feed")}
              className={cn(
                "hidden size-10 shrink-0 place-items-center rounded-xl lg:grid",
                showFeed
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Show room feed"
              aria-pressed={showFeed}
              title="Room feed"
            >
              <AppIcon name="feed" className={"size-6 sm:size-[34px]"} />
            </button>
          ) : null}
          {!room.is_direct ? (
            <button
              onClick={() => togglePanel("media")}
              className={cn(
                "hidden size-10 shrink-0 place-items-center rounded-xl lg:grid",
                showMedia
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label="Show radio and video players"
              aria-pressed={showMedia}
              title="Radio & video"
            >
              <AppIcon name="radio" className={"size-6 sm:size-[34px]"} />
            </button>
          ) : null}
          <button
            onClick={() => setCall("voice")}
            className="hidden size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary lg:grid"
            aria-label="Start voice call"
          >
            <AppIcon name="phone" className={"size-6 sm:size-[34px]"} />
          </button>
          <button
            onClick={() => setTalking((v) => !v)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-[11px] font-semibold sm:h-11 sm:gap-1.5 sm:px-3 sm:text-xs lg:h-10 lg:px-2.5",
              talking ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
            )}
            aria-label={talking ? "Leave room voice" : "Join room voice with push to talk"}
            aria-pressed={talking}
            title="Talk"
          >
            <AppIcon name="mic" className={"size-5 sm:size-6"} />
            Talk
          </button>
          {!room.is_direct && joined ? (
            <button
              onClick={() => void toggleHand()}
              className={cn(
                "hidden h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold lg:flex",
                myHand ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
              )}
              aria-label={myHand ? "Lower your hand" : "Raise your hand to ask for the mic"}
              aria-pressed={Boolean(myHand)}
              title="Raise hand"
            >
              <AppIcon name="hand" className={"size-6 sm:size-[34px]"} />
              {hands.length > 0 ? hands.length : "Hand"}
            </button>
          ) : null}
          <button
            onClick={() => {
              // Cams ride along on the room voice session, so make sure it's live.
              setTalking(true);
              setShowCams((v) => !v);
            }}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-[11px] font-semibold sm:h-11 sm:gap-1.5 sm:px-3 sm:text-xs lg:h-10 lg:px-2.5",
              showCams ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
            )}
            aria-label="Show room cameras"
            aria-pressed={showCams}
            title="Cams"
          >
            <AppIcon name="video" className={"size-5 sm:size-6"} />
            Cams
          </button>
          <button
            onClick={() => setCall("video")}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary sm:size-11 lg:size-10"
            aria-label="Start video call"
          >
            <AppIcon name="video" className={"size-6 sm:size-[34px]"} />
          </button>
          {/* Everything else folds into one menu on phones and tablets. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary lg:hidden"
              aria-label="More room options"
            >
              <MoreHorizontal className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{title}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCall("voice")}>
                <AppIcon name="phone" className={"size-6 sm:size-[34px]"} /> Voice call
              </DropdownMenuItem>
              {!room.is_direct && joined ? (
                <DropdownMenuItem onSelect={() => void toggleHand()}>
                  <AppIcon name="hand" className={"size-6 sm:size-[34px]"} /> {myHand ? "Lower hand" : "Raise hand"}
                  {hands.length > 0 ? ` (${hands.length})` : ""}
                </DropdownMenuItem>
              ) : null}
              {!room.is_direct ? (
                <DropdownMenuItem onSelect={() => togglePanel("media")}>
                  <AppIcon name="radio" className={"size-6 sm:size-[34px]"} /> Radio &amp; video
                </DropdownMenuItem>
              ) : null}
              {!room.is_direct && joined ? (
                <DropdownMenuItem onSelect={() => togglePanel("feed")}>
                  <AppIcon name="feed" className={"size-6 sm:size-[34px]"} /> Room feed
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => togglePanel("games")}>
                <AppIcon name="games" className={"size-6 sm:size-[34px]"} /> Games
              </DropdownMenuItem>
              {!room.is_direct ? (
                <DropdownMenuItem asChild>
                  <Link
                    to="/r/$slug"
                    params={{ slug: room.slug }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BadgeInfo className="size-4" /> View room profile
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {!room.is_direct ? (
                <DropdownMenuItem onSelect={() => togglePanel("trivia")}>
                  <AppIcon name="bot" className={"size-6 sm:size-[34px]"} /> Trivia bot
                </DropdownMenuItem>
              ) : null}
              {!room.is_direct ? (
                <DropdownMenuItem onSelect={() => togglePanel("karaoke")}>
                  <AppIcon name="mic" className={"size-6 sm:size-[34px]"} /> Karaoke queue
                </DropdownMenuItem>
              ) : null}
              {!room.is_direct && joined ? (
                <DropdownMenuItem onSelect={() => togglePanel("invite")}>
                  <AppIcon name="invite" className={"size-6 sm:size-[34px]"} /> Invite people
                </DropdownMenuItem>
              ) : null}
              {!room.is_direct && isSuper ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setStatusDraft(room.status_message ?? "")}>
                    Set room status
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {!room.is_direct ? (
        <div className="room-strip flex shrink-0 items-center gap-2 border-b border-border bg-secondary/50 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2 lg:py-1">
          <span className="shrink-0">
            <RatingControl
              rating={room.rating}
              canEdit={isOwner}
              onChange={async (next) => {
                try {
                  await setRoomRating(room.id, next);
                  await queryClient.invalidateQueries({ queryKey: ["rooms"] });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not change the room rating.");
                }
              }}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-bold text-primary lg:text-[13px]"
              style={room.name_color ? { color: room.name_color } : undefined}
            >
              {room.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground lg:text-[10px]">
              Owner: {profileOf(room.created_by)?.display_name ?? "—"}
              {"  |  "}Members: {members.length}
              {"  |  "}Online: {onlineCount}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium lg:mt-0 lg:gap-x-2 lg:text-[10px]">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/r/${room.slug}`,
                    );
                    setError("Room link copied to clipboard.");
                  } catch {
                    setError("Could not copy the room link.");
                  }
                }}
                className="text-primary underline-offset-2 hover:underline"
              >
                Copy room URL
              </button>
              <Link
                to="/r/$slug"
                params={{ slug: room.slug }}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                Rate this room
              </Link>
              {isSuper ? (
                <button
                  type="button"
                  onClick={() => setStatusDraft(room.status_message ?? "")}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Set alert
                </button>
              ) : null}
            </div>
          </div>
          <div className="hidden shrink-0 flex-col gap-1 sm:flex lg:flex-row lg:items-center lg:gap-2">
            <button
              type="button"
              onClick={() => {
                setTalking(true);
                setShowCams(true);
              }}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-secondary lg:px-1.5 lg:py-0.5"
            >
              <AppIcon name="video" className="size-5 lg:size-4" /> View cams
            </button>
            <button
              type="button"
              onClick={() => {
                setTalking(true);
                setShowCams(true);
              }}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-secondary lg:px-1.5 lg:py-0.5"
            >
              <AppIcon name="video" className="size-5 lg:size-4" /> My cam
            </button>
          </div>
        </div>
      ) : null}
      {!room.is_direct && (room.status_message || room.topic) ? (
        <div
          className="room-alerts shrink-0 space-y-0.5 border-b border-border bg-background px-2 py-1.5 text-[11px] leading-snug short:hidden sm:px-3 sm:py-2"
          role="note"
        >
          {room.status_message ? (
            <p>
              <span className="font-bold text-destructive">Alert: </span>
              <span className="text-foreground">{room.status_message}</span>
            </p>
          ) : null}
          {room.topic ? (
            <p>
              <span className="font-bold text-destructive">Alert: </span>
              <span className="text-foreground">{room.topic}</span>
            </p>
          ) : null}
          <p className="text-muted-foreground">
            This is a {room.rating === "R" ? "R rated room intended for adults 18 and over" : "G rated room intended for a general audience including minors. Offensive language is not permitted"}.
          </p>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
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
              isDirect={room.is_direct}
            />
          ) : null}

          {!room.is_direct && joined && hands.length > 0 ? (
            <section
              className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2"
              aria-label="Raised hands"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <AppIcon name="hand" className={"size-5"} />
                Mic queue
              </span>
              {hands.map((hand) => {
                const who = profileOf(hand.user_id);
                const granted = Boolean(hand.granted_at);
                return (
                  <span
                    key={hand.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-2 py-1 text-[11px]",
                      granted ? "bg-primary/15 text-primary" : "bg-background",
                    )}
                  >
                    {who?.display_name ?? "Member"}
                    {granted ? " · has the mic" : ""}
                    {canModerate ? (
                      <button
                        onClick={() =>
                          void runModeration(
                            () =>
                              granted
                                ? revokeMic(room.id, hand.user_id)
                                : grantMic(room.id, hand.user_id, meId),
                            ["room-hands"],
                          )
                        }
                        className="rounded-lg bg-secondary px-1.5 py-0.5 font-medium"
                      >
                        {granted ? "Take back" : "Give mic"}
                      </button>
                    ) : null}
                    {hand.user_id === meId ? (
                      <button
                        onClick={() => void toggleHand()}
                        aria-label="Lower your hand"
                        className="rounded-lg bg-secondary px-1.5 py-0.5 font-medium"
                      >
                        Lower
                      </button>
                    ) : null}
                  </span>
                );
              })}
            </section>
          ) : null}

          {!room.is_direct ? (
            <div className="short:hidden">
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
            </div>
          ) : null}

        {showInvite && !room.is_direct ? (
          <InvitePanel
            roomId={room.id}
            roomName={room.name}
            memberships={members}
            profiles={profiles}
            meId={meId}
            onClose={() => setShowInvite(false)}
          />
        ) : null}

        {showFeed && !room.is_direct ? (
          <RoomFeed
            roomId={room.id}
            meId={meId}
            profiles={profiles}
            canModerate={canModerate}
            onClose={() => setShowFeed(false)}
          />
        ) : null}

        {joined ? (
          <>
            <div
              ref={scroller}
              className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-5"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-label="Messages"
              tabIndex={0}
            >
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
                        {name}{" "}
                        {item.action === "join"
                          ? "joined"
                          : item.action === "bounce"
                            ? "was bounced from"
                            : "left"}{" "}
                        the room · {formatTime(item.at)}
                      </span>
                    </div>
                  );
                }
                const m = item.message;
                const mine = m.user_id === meId;
                const liveNotice = liveNoticeOf(m.body);
                if (liveNotice) {
                  const who = profileOf(m.user_id);
                  const name = mine ? "You" : (who?.display_name ?? "Someone");
                  return (
                    <div key={m.id} className="mt-4 flex justify-center">
                      <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-medium text-primary">
                        <AppIcon name="video" className={"size-5"} />
                        {liveNotice === "on"
                          ? `${name} ${mine ? "are" : "is"} live on camera`
                          : `${name} stopped the camera`}{" "}
                        · {formatTime(m.created_at)}
                      </span>
                    </div>
                  );
                }

                const giftNotice = giftNoticeOf(m.body);
                if (giftNotice) {
                  const who = profileOf(m.user_id);
                  const name = mine ? "You" : (who?.display_name ?? "Someone");
                  return (
                    <div key={m.id} className="mt-4 flex justify-center">
                      <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-center text-[11px] font-medium text-primary">
                        <span className="text-sm leading-none" aria-hidden>
                          {giftNotice.emoji}
                        </span>
                        {`${name} sent ${giftNotice.recipientName} a ${giftNotice.label}`} ·{" "}
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  );
                }
                const prev = timeline[i - 1];
                const grouped =
                  prev?.kind === "message" &&
                  prev.message.user_id === m.user_id &&
                  !isNotice(prev.message.body);
                const author = profileOf(m.user_id);
                const authorName = author?.display_name ?? "Someone";
                const roleOfAuthor = siteRoleOf(siteRoles, m.user_id);
                if (phone) {
                  const media = gifUrlOf(m.body);
                  const video = videoEmbedOf(m.body);
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-start gap-2 px-0.5",
                        grouped ? "mt-1" : "mt-2.5",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openProfile(m.user_id)}
                        aria-label={`View ${authorName}'s profile`}
                        className="mt-0.5 shrink-0 rounded-full hover:opacity-80"
                      >
                        <Avatar
                          name={authorName}
                          accent={accentFor(m.user_id)}
                          avatarPath={author?.avatar_url ?? null}
                          online={author ? isOnline(author) : false}
                          size="sm"
                        />
                      </button>
                      <div className="min-w-0 flex-1 text-[13px] leading-snug">
                        <span
                          className={cn(
                            "mr-1 font-bold",
                            siteRoleTextClass(roleOfAuthor) ?? "text-primary",
                          )}
                          style={nameColorStyle(roleOfAuthor, author?.name_color)}
                        >
                          {mine ? "You" : authorName}
                        </span>
                        {media ? (
                          <img
                            src={media}
                            alt={`GIF sent by ${authorName}`}
                            loading="lazy"
                            className="mt-1 max-h-40 rounded-xl border border-border object-cover"
                          />
                        ) : video ? (
                          <MessageVideo video={video} />
                        ) : (
                          <span
                            className={cn(
                              "break-words text-foreground",
                              (isEmojiOnly(m.body) || isImageEmojiOnly(m.body)) &&
                                "text-2xl leading-tight",
                            )}
                          >
                            {hasImageEmoji(m.body) ? (
                              <EmojiText body={m.body} large={isImageEmojiOnly(m.body)} />
                            ) : isEmojiOnly(m.body) || mine ? (
                              m.body
                            ) : (
                              <TranslatedText text={m.body} auto />
                            )}
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  );
                }
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
                      <button
                        type="button"
                        onClick={() => openProfile(m.user_id)}
                        aria-label={`View ${authorName}'s profile`}
                        className="shrink-0 rounded-2xl hover:opacity-80"
                      >
                        <Avatar
                          name={authorName}
                          accent={accentFor(m.user_id)}
                          avatarPath={author?.avatar_url ?? null}
                          online={author ? isOnline(author) : false}
                          size="sm"
                        />
                      </button>
                    )}
                    <div className={cn("flex min-w-0 flex-col", mine ? "items-end" : "items-start")}>
                      {!mine && !grouped ? (
                        <span className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-medium">
                          <span
                            className={
                              siteRoleTextClass(siteRoleOf(siteRoles, m.user_id)) ??
                              "text-muted-foreground"
                            }
                            style={nameColorStyle(
                              siteRoleOf(siteRoles, m.user_id),
                              author?.name_color,
                            )}
                          >
                            {authorName}
                          </span>
                          {siteRoleLabel(siteRoleOf(siteRoles, m.user_id)) ? (
                            <span
                              className={cn(
                                "rounded-md px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                                siteRoleBadgeClass(siteRoleOf(siteRoles, m.user_id)),
                              )}
                            >
                              {siteRoleLabel(siteRoleOf(siteRoles, m.user_id))}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                      {gifUrlOf(m.body) ? (
                        <img
                          src={gifUrlOf(m.body)!}
                          alt={`GIF sent by ${authorName}`}
                          loading="lazy"
                          className="max-h-56 max-w-[78%] rounded-2xl border border-border object-cover"
                        />
                      ) : videoEmbedOf(m.body) ? (
                        <MessageVideo video={videoEmbedOf(m.body)!} />
                      ) : (
                        <div
                          data-chat-bubble={mine ? "me" : "them"}
                          className={cn(
                            "max-w-[92%] px-3 py-2 text-sm leading-relaxed sm:max-w-[78%] sm:px-4 sm:py-2.5",
                            mine
                              ? "rounded-3xl rounded-br-md bg-bubble-me text-bubble-me-foreground"
                              : "rounded-3xl rounded-bl-md bg-bubble-them text-bubble-them-foreground",
                            (isEmojiOnly(m.body) || isImageEmojiOnly(m.body)) &&
                              "bg-transparent px-1 py-0.5 text-3xl leading-tight",
                          )}
                        >
                          {hasImageEmoji(m.body) ? (
                            <EmojiText body={m.body} large={isImageEmojiOnly(m.body)} />
                          ) : isEmojiOnly(m.body) || mine ? (
                            m.body
                          ) : (
                            <TranslatedText text={m.body} auto className="block" />
                          )}
                        </div>
                      )}
                      <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="border-t border-border px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:py-3 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {error ? (
                <p role="alert" className="px-2 pb-2 text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              <div className="flex items-end gap-1.5 rounded-2xl bg-secondary p-1.5 sm:gap-2 sm:p-2">
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
                <GifPicker
                  onSelect={(url) => {
                    void (async () => {
                      try {
                        await sendMessage(room.id, meId, url);
                        await queryClient.invalidateQueries({ queryKey: ["messages", room.id] });
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "GIF failed to send.");
                      }
                    })();
                  }}
                />
                <GifPicker
                  media="stickers"
                  onSelect={(url) => {
                    void (async () => {
                      try {
                        await sendMessage(room.id, meId, url);
                        await queryClient.invalidateQueries({ queryKey: ["messages", room.id] });
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Sticker failed to send.");
                      }
                    })();
                  }}
                />
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  disabled={Boolean(mySilence)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder={
                    mySilence
                      ? "You are silenced in this room — you can still read along."
                      : `Message ${room.name}`
                  }
                  aria-label="Message"
                  className="max-h-32 min-h-9 w-full resize-none bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-70 sm:min-h-11 sm:px-2 sm:py-2 sm:text-base lg:min-h-9 lg:py-1.5 lg:text-sm"
                />
                <button
                  onClick={() => void submit()}
                  disabled={draft.trim().length === 0 || Boolean(mySilence)}
                  aria-label="Send message"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40 sm:size-11 lg:size-10"
                >
                  <YahooSendIcon className="size-6 sm:size-[34px]" />
                </button>
              </div>
            </footer>
            {!room.is_direct ? (
              <div className="room-bottom-bar flex shrink-0 items-center gap-1 border-t border-border bg-secondary/60 px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:pb-[max(0.375rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => {
                    setTalking(false);
                    setShowCams(false);
                  }}
                  className={cn(
                    "rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold",
                    talking ? "bg-background hover:bg-secondary" : "bg-primary/15 text-primary",
                  )}
                  aria-pressed={!talking}
                >
                  Mute
                </button>
                <button
                  type="button"
                  onClick={() => togglePanel("media")}
                  className="grid size-8 place-items-center rounded-md border border-border bg-background hover:bg-secondary"
                  aria-label="Radio and video"
                >
                  <AppIcon name="radio" className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTalking((v) => !v)}
                  className={cn(
                    "grid size-8 place-items-center rounded-md border border-border",
                    talking ? "bg-primary/15 text-primary" : "bg-background hover:bg-secondary",
                  )}
                  aria-label="Push to talk"
                  aria-pressed={talking}
                >
                  <AppIcon name="mic" className="size-5" />
                </button>
                <span className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void toggleHand()}
                    className={cn(
                      "flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold",
                      myHand ? "bg-primary/15 text-primary" : "bg-background hover:bg-secondary",
                    )}
                    aria-pressed={Boolean(myHand)}
                  >
                    <Hand className="size-3.5" /> Raise
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePanel("invite")}
                    className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-secondary"
                  >
                    <UserPlus className="size-3.5" /> Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTalking(true);
                      setShowCams((v) => !v);
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold",
                      showCams ? "bg-primary/15 text-primary" : "bg-background hover:bg-secondary",
                    )}
                    aria-pressed={showCams}
                  >
                    <Video className="size-3.5" /> Show cam
                  </button>
                </span>
              </div>
            ) : null}
          </>

        ) : (
          <div className="grid min-h-0 flex-1 place-items-center px-6 text-center">
            <div className="max-w-sm">
              {ageBlocked ? (
                <>
                  <h3 className="text-lg font-semibold">Adults only</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    “{title}” is rated R. You must be 18 or older to join.
                    {myProfile?.birth_date
                      ? ""
                      : " Add your date of birth in Settings to confirm your age."}
                  </p>
                  {myProfile?.birth_date ? null : (
                    <Link
                      to="/settings"
                      className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                      Open settings
                    </Link>
                  )}
                </>
              ) : needsCode ? (
                <>
                  <h3 className="flex items-center justify-center gap-2 text-lg font-semibold">
                    <AppIcon name="lock" className={"size-6 sm:size-[34px]"} />
                    {title} is locked
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ask the room owner for the entry code, then type it below.
                  </p>
                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void enterWithCode();
                    }}
                  >
                    <input
                      value={codeDraft}
                      onChange={(e) => setCodeDraft(e.target.value)}
                      maxLength={40}
                      autoComplete="off"
                      aria-label="Room entry code"
                      placeholder="Entry code"
                      className="min-w-0 flex-1 rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="submit"
                      disabled={!codeDraft.trim() || unlocking}
                      className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
                    >
                      {unlocking ? "Checking…" : "Enter"}
                    </button>
                  </form>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        )}

          {showFeed || showMedia || showGames || showTrivia || showInvite || showKaraoke || showMembers ? (
            <button
              type="button"
              aria-label="Close panel"
              onClick={() => {
                closeOverlayPanels();
                setShowMembers(false);
              }}
              className="absolute inset-0 z-10 bg-background/50 md:hidden"
            />
          ) : null}

          {!room.is_direct ? (
            <section
              className={cn(
                "absolute inset-y-0 right-0 z-20 flex w-full max-w-[92%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out sm:max-w-sm",
                showMedia ? "translate-x-0" : "invisible pointer-events-none translate-x-full",
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
              showGames ? "translate-x-0" : "invisible pointer-events-none translate-x-full",
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
                showTrivia ? "translate-x-0" : "invisible pointer-events-none translate-x-full",
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

          {!room.is_direct ? (
            <section
              className={cn(
                "absolute inset-y-0 right-0 z-20 flex w-full max-w-[92%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out sm:max-w-sm",
                showKaraoke ? "translate-x-0" : "invisible pointer-events-none translate-x-full",
              )}
              aria-hidden={!showKaraoke}
              role="region"
              aria-label="Karaoke queue"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <h3 className="text-sm font-semibold">Karaoke</h3>
                <button
                  onClick={() => setShowKaraoke(false)}
                  className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
                  aria-label="Close karaoke queue"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <KaraokePanel
                  roomId={room.id}
                  meId={meId}
                  joined={joined}
                  canModerate={canModerate}
                  queue={karaokeQueue}
                  profiles={profiles}
                  nowPlayingUrl={room.youtube_url}
                  onStage={async (song) => {
                    const previous = karaokeQueue.find(
                      (s) => !s.played_at && s.youtube_url === room.youtube_url && s.id !== song.id,
                    );
                    if (previous) await markKaraokeSongPlayed(previous.id);
                    await setRoomYouTube(room.id, {
                      url: song.youtube_url,
                      title: song.artist ? `${song.title} — ${song.artist}` : song.title,
                    });
                    await queryClient.invalidateQueries({ queryKey: ["rooms"] });
                    await queryClient.invalidateQueries({ queryKey: ["karaoke-queue", room.id] });
                  }}
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
            onGift={(userId) => setGiftTo(userId)}
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
      {giftTo && giftProfile ? (
        <GiftDialog
          meId={meId}
          recipientId={giftTo}
          recipientName={giftProfile.display_name}
          roomId={room.is_direct ? null : room.id}
          onClose={() => setGiftTo(null)}
        />
      ) : null}
      {editingRoom && !room.is_direct ? (
        <EditRoomDialog room={room} onDone={() => setEditingRoom(false)} />
      ) : null}
    </section>
  );
}
