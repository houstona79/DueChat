import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, Users } from "lucide-react";
import { getRoomsDirectory, type DirectoryRoom } from "@/lib/rooms-directory.functions";
import { RatingBadge } from "@/components/messenger/RoomRating";
import { StarRow } from "@/components/rooms/StarRating";
import { initials } from "@/lib/chat";

const title = "Top rooms & full room list — DueChat";
const description =
  "Browse every public DueChat chat room, see member counts and star ratings, and jump into the top-rated rooms.";

export const Route = createFileRoute("/rooms")({
  loader: () => getRoomsDirectory(),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">The room list couldn’t load right now.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">No rooms found.</p>
    </main>
  ),
  component: RoomsDirectoryPage,
});

function RoomIcon({ name, url }: { name: string; url: string | null }) {
  return url ? (
    <img src={url} alt="" loading="lazy" className="size-11 shrink-0 rounded-2xl object-cover" />
  ) : (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-xs font-bold">
      {initials(name)}
    </span>
  );
}

function RoomCard({ room, rank }: { room: DirectoryRoom; rank?: number }) {
  const avg = room.rating_avg ? Number(room.rating_avg) : 0;
  return (
    <li className="rounded-3xl border border-border bg-card p-4">
      <Link
        to="/r/$slug"
        params={{ slug: room.slug }}
        className="flex items-start gap-3 focus-visible:outline-none"
      >
        {rank ? (
          <span className="mt-1 w-5 shrink-0 text-sm font-bold text-muted-foreground">{rank}</span>
        ) : null}
        <RoomIcon name={room.name} url={room.icon_url} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className="truncate font-semibold"
              style={room.name_color ? { color: room.name_color } : undefined}
            >
              {room.name}
            </span>
            <RatingBadge rating={room.rating} />
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{room.category || "General"}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {room.member_count}
            </span>
            <StarRow value={avg} />
            <span>
              {room.rating_count > 0 ? `${avg.toFixed(1)} (${room.rating_count})` : "No ratings"}
            </span>
          </span>
          {room.topic ? (
            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
              {room.topic}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

function RoomsDirectoryPage() {
  const { top, all } = Route.useLoaderData();

  return (
    <main
      id="main-content"
      className="mx-auto w-full min-w-0 max-w-3xl px-3 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8"
    >
      <Link
        to="/chat"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to DueChat
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">DueChat rooms</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Top-rated rooms plus every public room on DueChat. Help lobbies and staff rooms aren’t
        listed.
      </p>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Crown className="size-4 text-primary" aria-hidden />
          Top rooms
        </h2>
        {top.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No rated rooms yet — rate a room to start the leaderboard.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {top.map((room, i) => (
              <RoomCard key={room.id} room={room} rank={i + 1} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">All rooms ({all.length})</h2>
        {all.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No public rooms yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {all.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}