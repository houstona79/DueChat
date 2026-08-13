import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import duechatLogo from "@/assets/duechat-logo.png.asset.json";
import { Sidebar } from "@/components/messenger/Sidebar";
import { ProfileViewer } from "@/components/messenger/ProfileViewer";
import { IncomingCallWatcher } from "@/components/messenger/IncomingCallWatcher";
import { DirectMessageAlerts } from "@/components/messenger/DirectMessageAlerts";
import { FloatingRoomWindows } from "@/components/messenger/FloatingRoomWindows";
import { FloatingRoomsProvider } from "@/lib/floating-rooms";
import { SupportWidget } from "@/components/support/SupportWidget";
import { useAuth, useMyProfile } from "@/hooks/use-auth";
import { useMyBan } from "@/hooks/use-my-ban";
import {
  useChatRealtime,
  useMemberships,
  usePresenceHeartbeat,
  useProfiles,
  useRooms,
} from "@/hooks/use-chat";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Your rooms — DueChat" },
      {
        name: "description",
        content: "Chat rooms, live presence and voice or video calls with your people.",
      },
      { property: "og:title", content: "Your rooms — DueChat" },
      {
        property: "og:description",
        content: "Chat rooms, live presence and voice or video calls with your people.",
      },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const { user } = useAuth();
  const { data: me } = useMyProfile(user?.id);
  const { data: rooms = [] } = useRooms();
  const { data: memberships = [] } = useMemberships();
  const { data: profiles = [] } = useProfiles();
  const { data: myBan } = useMyBan(user?.id);
  usePresenceHeartbeat(user?.id);
  useChatRealtime();

  const params = useParams({ strict: false }) as { roomId?: string };
  const activeRoomId = params.roomId;
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const popout = /(^|[?&])popout=1(&|$)/.test(search ?? "");

  if (myBan) return <BannedScreen reason={myBan.reason} />;

  if (popout && activeRoomId) {
    return (
      <>
        <main id="main-content" className="fixed inset-0 overflow-hidden overscroll-none">
          <Outlet />
        </main>
        <ProfileViewer />
        {user?.id ? (
          <IncomingCallWatcher rooms={rooms} profiles={profiles} meId={user.id} />
        ) : null}
      </>
    );
  }

  return (
    <FloatingRoomsProvider>
      <main
        id="main-content"
        className="fixed inset-0 grid overflow-hidden overscroll-none grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]"
      >
        <div
          className={
            activeRoomId
              ? "hidden min-h-0 min-w-0 border-r border-border md:block"
              : "min-h-0 min-w-0 border-r border-border"
          }
        >
          <Sidebar
            rooms={rooms}
            memberships={memberships}
            profiles={profiles}
            me={me}
            activeRoomId={activeRoomId}
          />
        </div>
        <div className={activeRoomId ? "min-h-0 min-w-0" : "hidden min-h-0 min-w-0 md:block"}>
          {activeRoomId ? (
            <Outlet />
          ) : (
            <div className="grid h-full place-items-center bg-background px-6 text-center">
              <div className="max-w-sm">
                <img
                  src={duechatLogo.url}
                  alt="DueChat"
                  className="mx-auto h-16 w-auto object-contain"
                />
                <span className="mx-auto mt-4 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <MessagesSquare className="size-7" />
                </span>
                <h2 className="mt-5 text-xl font-semibold">Pick a room</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose a room on the left, or create a new one to start talking.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <FloatingRoomWindows />
      <ProfileViewer />
      {user?.id ? <IncomingCallWatcher rooms={rooms} profiles={profiles} meId={user.id} /> : null}
      {user?.id ? (
        <DirectMessageAlerts
          rooms={rooms}
          profiles={profiles}
          meId={user.id}
          activeRoomId={activeRoomId}
        />
      ) : null}
    </FloatingRoomsProvider>
  );
}

/** Banned members can't enter the messenger — only appeal through live support. */
function BannedScreen({ reason }: { reason: string | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <main id="main-content" className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="max-w-md text-center">
          <img
            src={duechatLogo.url}
            alt="DueChat"
            className="mx-auto h-14 w-auto object-contain"
          />
          <span className="mx-auto mt-5 grid size-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
            <ShieldAlert className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-xl font-semibold">Your account is banned</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You can’t sign in to the DueChat messenger.
            {reason ? ` Reason: ${reason}` : ""}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Use live support below to appeal — an admin will reply right here.
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Sign out
          </button>
        </div>
      </main>
      <SupportWidget notice="Your account is banned from DueChat. Message an admin here to appeal." />
    </>
  );
}
