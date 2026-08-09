import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { Sidebar } from "@/components/messenger/Sidebar";
import { ProfileViewer } from "@/components/messenger/ProfileViewer";
import { IncomingCallWatcher } from "@/components/messenger/IncomingCallWatcher";
import { useAuth, useMyProfile } from "@/hooks/use-auth";
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
  usePresenceHeartbeat(user?.id);
  useChatRealtime();

  const params = useParams({ strict: false }) as { roomId?: string };
  const activeRoomId = params.roomId;

  return (
    <>
      <main
        id="main-content"
        className="grid h-dvh grid-cols-1 overflow-hidden md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]"
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
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
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
      <ProfileViewer />
      {user?.id ? <IncomingCallWatcher rooms={rooms} profiles={profiles} meId={user.id} /> : null}
    </>
  );
}
