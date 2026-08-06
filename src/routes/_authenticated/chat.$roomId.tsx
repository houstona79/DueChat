import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChatPane } from "@/components/messenger/ChatPane";
import { useAuth } from "@/hooks/use-auth";
import { useMemberships, useProfiles, useRooms } from "@/hooks/use-chat";

export const Route = createFileRoute("/_authenticated/chat/$roomId")({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = useParams({ from: "/_authenticated/chat/$roomId" });
  const { user } = useAuth();
  const { data: rooms = [], isLoading } = useRooms();
  const { data: memberships = [] } = useMemberships();
  const { data: profiles = [] } = useProfiles();

  const room = rooms.find((r) => r.id === roomId);

  if (!user) return null;

  if (!room) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
        {isLoading ? "Loading room…" : "This room no longer exists."}
      </div>
    );
  }

  return (
    <ChatPane
      key={room.id}
      room={room}
      memberships={memberships}
      profiles={profiles}
      meId={user.id}
    />
  );
}
